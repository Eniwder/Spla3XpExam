import { Player } from "./Player.js";
import { Glicko2 } from 'glicko2';

// players.push(new Player(id, powerTrue, powerAvg + (powerTrue - powerAvg) * 0.5, rd, vol, (Math.random() * battleBalance.performanceBias) / 100));
// Player.init({ tau: ratingParam.tau, rating: playersStats.powerAvg, rd: ratingParam.rd, vol: ratingParam.vol });

export class Xmatch {

  static LimitRateMatch = 'limitRateMatch';
  static SequentialMatch = 'sequentialMatch';

  static Spla2 = 0;
  static Spla3 = 1;
  static Custom = 2;
  static gameVer = -1;

  static ranking4Tmp = null;
  static predictPool = null;

  static players = [];
  static matchBucket = [];
  static bucketSep = 25;

  static matchingConfig = {};
  static ratingParam = {};
  static battleBalance = {};
  static sampleIds = [];

  static init(players, sampleIds, opts) {
    Xmatch.matchingConfig = opts.matchingConfig;
    Xmatch.ratingParam = opts.ratingParam;
    Xmatch.battleBalance = opts.battleBalance;
    Xmatch.sampleIds = sampleIds;
    Xmatch.gameVer = opts.gameVer;

    Xmatch.ranking4Tmp = new Glicko2(Xmatch.ratingParam);
    Xmatch.predictPool = range(2).map(_ => Xmatch.ranking4Tmp.makePlayer());
    players.forEach(pl => {
      Xmatch.players.push(new Player(pl[0], pl[1], opts.ratingParam.powerAvg + (pl[1] - opts.ratingParam.powerAvg) * 0.5,
        Xmatch.ratingParam.rd, Xmatch.ratingParam.vol, pl[2], pl[3], pl[4]));
    });
    Player.init(Xmatch.ratingParam);
    bucketUpdate();
  }

  static getSamplesXp() {
    return Xmatch.sampleIds.reduce((acc, v) => {
      acc[v] = Xmatch.players[v].xp;
      return acc;
    }, {});
  }

  static processMatch() {
    const { matchingConfig, ratingParam, battleBalance } = Xmatch;
    const matchGroupKeys = getMatchGroupKeys(0, 0, 0);
    const groups = matchGroupKeys.flatMap(mgk => getMatches(mgk, matchingConfig));
    Xmatch.matchBucket = [];
    groups.forEach(grp => {
      const teams = group2Team(grp, matchingConfig.fairSplitTeam >= Math.random());
      executeMatch(teams, { matchingConfig, ratingParam, battleBalance });
    });
    bucketUpdate();
  }
}

function bucketUpdate() {
  Xmatch.matchBucket = [];
  Xmatch.players.forEach(player => {
    const bucket = player.xp - (player.xp % Xmatch.bucketSep);
    if (!Xmatch.matchBucket[bucket]) Xmatch.matchBucket[bucket] = [];
    Xmatch.matchBucket[bucket].push(player);
  });
  // マッチングの偏りを防ぐためにシャッフル
  Xmatch.matchBucket.forEach(_ => _.shuffle());
}

function executeMatch(teams, opts) {
  const { isFT3, isGuarantee } = opts.ratingParam;
  const { connectionErrorRate } = opts.matchingConfig;

  // glicko2は1vs1で対戦するレーティングシステムのため、各チームの平均ステータスを持つ仮想プレイヤーを作成して計算をする
  const teamsWithStats = teams.map(team => ({
    // 真の実力は±N%のブレが存在すると考えて計算する。ブレはプレイヤーによって異なる。
    trueRating: average(team.map(_ => _.trueRating * (1 + _.performanceBias * 2 * Math.random() - _.performanceBias))),
    xp: average(team.map(_ => _.xp)),
    rd: average(team.map(_ => _.rd)),
    vol: average(team.map(_ => _.vol)),
  }));

  // スプラのXPではなく内部レート(真の実力と仮定)を元に勝率を計算する
  // 勝敗は部屋の相手チームの平均パワーと離れているプレイヤーに係数をかけて算出する
  // 例えばpif(Positive Inpact Factor)が高いプレイヤーはスタダギアなどで格下に強く、低いプレイヤーは前に出ない後衛など試合への関与が低いと想定
  // nif(Negative Inpact Factor)が高いプレイヤーはスタダギアなどで格上が来るとギアが無駄になって弱く、低いプレイヤーは塗りサポートがうまいとか
  // つまり、人によって格下に勝ちやすい/勝ちにくい、格上に負けやすい/負けにくいが発生する仕組み
  const adjustImpact = (ratingDifference, pif, nif) => ratingDifference >= 0
    ? pif * ratingDifference : -nif * ratingDifference;

  teamsWithStats.forEach((team, idx) => {
    team.actualPower = team.trueRating + sum(teams[idx].map(_ => adjustImpact(_.trueRating - team.trueRating, _.pif, _.nif)));
    Xmatch.predictPool[idx].setRating(team.actualPower);
    Xmatch.predictPool[idx].setRd(team.rd);
    Xmatch.predictPool[idx].setVol(team.vol);
  });

  const expected = Xmatch.ranking4Tmp.predict(Xmatch.predictPool[0], Xmatch.predictPool[1]);
  const judge = (expected > Math.random()) ? 1 : 0;

  teamsWithStats[0].expected = expected;
  teamsWithStats[1].expected = 1 - expected;
  teamsWithStats[0].isWin = judge;
  teamsWithStats[1].isWin = 1 - judge;

  // 回線落ちが発生したら片方が勝ち、片方は何も起きなかった状態にする
  if ((connectionErrorRate / 100) > Math.random()) {
    const winTeamIdx = Math.random() > 0.5 ? 0 : 1;
    teams[winTeamIdx].expected = -1;
    teams[winTeamIdx].isWin = 1;
    teams[winTeamIdx].forEach(player => {
      player.battle(teamsWithStats[winTeamIdx - 0], teamsWithStats[1 - winTeamIdx], isFT3, isGuarantee);
    });
    return;
  }
  teams.forEach((team, idx) => {
    team.forEach(player => {
      player.battle(teamsWithStats[idx - 0], teamsWithStats[1 - idx], isFT3, isGuarantee);
    });
  });
}

function group2Team(grp, fairSplitTeam) {
  const teams = [[], []];
  if (fairSplitTeam) {
    grp.sort((a, b) => Math.min(b.xp) - Math.min(a.xp));
  } else {
    grp.shuffle();
  }
  teams[0].push(grp[0], grp[3], grp[4], grp[7]);
  teams[1].push(grp[1], grp[2], grp[5], grp[6]);
  return teams;
}


function getMatchGroupKeys(splitRankN, splitXpN, countStop) {
  let matchGroupKeys = [];
  // keys = [1025,1050,1075,1100,1150,...]
  // Sep単位で、プレイヤーが存在するレート帯ごとに格納されている
  const keys = Object.keys(Xmatch.matchBucket).map(Number);
  keys.sort((a, b) => b - a);
  // 1. 指定XP以上を同一XPとみなす
  if (countStop > 0 && (countStop > keys[0])) {
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] < countStop) {
        // keys[i - 1]を基準にして、前のレート帯のプレイヤーをまとめる。keys[i]はすでに含まれているので(i-1)でよい
        for (let j = 0; j < (i - 1); j++) {
          Xmatch.matchBucket[keys[i - 1]].push(...Xmatch.matchBucket[keys[j]]);
        }
        break;
      }
    }
  }

  // 2. 指定順位で区切る
  if (splitRankN > 0 && (Xmatch.players.length > splitRankN)) { // マッチングをN位以内で区切る場合
    let sum = 0;
    for (let i = 0; i < keys.length; i++) {
      sum += Xmatch.matchBucket[keys[i]].length;
      if (sum >= splitRankN) {
        matchGroupKeys.push(keys.slice(0, i), keys.slice(i));
        break;
      }
    }
  } else {
    matchGroupKeys.push(keys);
  }

  // 3. 指定XPで区切る(優先度は[順位区切り>XP区切り])
  if (splitXpN > 0) {
    const keys2 = matchGroupKeys[matchGroupKeys.length - 1];
    for (let i = 0; i < keys2.length; i++) {
      if (keys2[i] <= splitXpN) {
        const tmpkeys = matchGroupKeys[matchGroupKeys.length - 1].pop();
        matchGroupKeys.push(tmpkeys.slice(0, i), tmpkeys.slice(i));
        break;
      }
    }
  }
  return matchGroupKeys;
}

function getMatches(matchGroupKeys, matchingConfig) {
  return (matchingConfig.matchAlgo === Xmatch.LimitRateMatch) ? limitRateMatch(matchGroupKeys, matchingConfig) :
    (matchingConfig.matchAlgo === Xmatch.SequentialMatch) ? sequentialMatch(matchGroupKeys) : sequentialMatch(matchGroupKeys);

  // 指定したレート範囲でランダムに選ばれたメンバーでマッチングをする
  function limitRateMatch(matchGroupKeys, matchingConfig) {
    const groups = [];
    // マッチング区切り処理を追加したい
    const { mathLimitRate } = matchingConfig;
    matchGroupKeys.sort((a, b) => b - a); // 不要かも　負荷次第で消す

    let currentGroup = [];
    const idxStep = parseInt(mathLimitRate / Xmatch.bucketSep);
    // TODO 運が悪いと試合できない人が出てくるけど許容?

    for (let i = 0; i < matchGroupKeys.length; i++) {
      const key = matchGroupKeys[i];
      if (!Xmatch.matchBucket[key]) continue;
      currentGroup = [];
      currentGroup.push(Xmatch.matchBucket[key].shift());
      if (Xmatch.matchBucket[key].length == 0) {
        Xmatch.matchBucket[key] = null;
      }
      let nextKeys = range(idxStep).map(_ => key + _ * Xmatch.bucketSep).filter(key => Xmatch.matchBucket[key]);
      for (let j = 0; j < 7; j++) {
        if (nextKeys.length == 0) break;
        const nextKey = Math.floor(nextKeys.length * Math.random());
        currentGroup.push(Xmatch.matchBucket[nextKeys[nextKey]].shift());
        if (Xmatch.matchBucket[nextKeys[nextKey]]?.length == 0) {
          Xmatch.matchBucket[nextKeys[nextKey]] = null;
          nextKeys = range(idxStep).map(_ => _ * Xmatch.bucketSep).filter(key => Xmatch.matchBucket[key]);
        }
      }
      if (currentGroup.length === 8) {
        groups.push(currentGroup);
      } else {
        currentGroup = [];
      }
      if (Xmatch.matchBucket[key]) i--;
    }

    return groups;
  }

  // 上位から8人ずつマッチングしていく
  // TODO 最下位付近は試合できない人が出てくるけど許容
  function sequentialMatch(matchGroupKeys) {
    const groups = [];
    const bukects = matchGroupKeys.sort((a, b) => b - a);
    let currentGroup = [];
    bukects.forEach(k => {
      for (let i = 0, len = Xmatch.matchBucket[k].length; i < len; i++) {
        const player = Xmatch.matchBucket[k][i];
        currentGroup.push(player);
        if (currentGroup.length == 8) {
          groups.push(currentGroup);
          currentGroup = [];
        }
      }
    });
    return groups;
  }
}


function average(array) {
  if (array.length === 0) return NaN;
  const sum = array.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
  return sum / array.length;
}

function sum(array) {
  return array.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
}

function range(n) {
  return Array.from(Array(n), (v, k) => k);
}

Array.prototype.shuffle = function () {
  for (let i = this.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [this[i], this[j]] = [this[j], this[i]];
  }
  return this; // 元の配列を返す
};
