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

  static ranking4Tmp = null;
  static predictPool = null;

  static players = [];
  static matchBucket = [[], [], []];
  static bucketSep = 25;

  static init(ratingParam, players) {
    console.log("heere");
    Xmatch.ranking4Tmp = new Glicko2(ratingParam);
    Xmatch.predictPool = range(2).map(_ => Xmatch.ranking4Tmp.makePlayer());
    // players.forEach(pl => {
    //   Xmatch.players.push(new Player(pl[0], pl[1], powerAvg + (pl[1] - powerAvg) * 0.5, rd, vol, (Math.random() * battleBalance.performanceBias) / 100));
    // });
    // Player.init({ tau: ratingParam.tau, rating: playersStats.powerAvg, rd: ratingParam.rd, vol: ratingParam.vol });
    // [Xmatch.Spla2, Xmatch.Spla3, Xmatch.Custom].forEach(gameVer => Xmatch.bucketUpdate(gameVer, players));
  }

  static bucketUpdate(gameVer, players) {
    Xmatch.matchBucket[gameVer] = [];
    players.forEach(player => {
      const bucket = player.xps[gameVer] - (player.xps[gameVer] % Xmatch.bucketSep);
      if (!Xmatch.matchBucket[gameVer][bucket]) Xmatch.matchBucket[gameVer][bucket] = [];
      Xmatch.matchBucket[gameVer][bucket].push(player);
    });
  }

  static processSpla2Match(players) {
    const matchGroupKeys = getMatchGroupKeys(players, Xmatch.Spla2, 0, 0, 0);
    const groups = matchGroupKeys.flatMap(mgk => getMatches(mgk, Xmatch.Spla2, {
      matchAlgo: Xmatch.LimitRateMatch,
      limitRateDiff: 300,
    }));
    Xmatch.matchBucket[Xmatch.Spla2] = [];
    // console.time('grping');
    // console.timeEnd('grping');
    groups.forEach(grp => {
      const teams = group2Team(grp, Xmatch.Spla2, Math.random() > 0.5);
      executeMatch(teams, {
        gameVer: Xmatch.Spla2,
        ratingParam: {
          isFT3: false,
          isGuarantee: false,
        },
        matchingConfig: {
          connectionErrorRate: 0.5
        },
        battleBalance: {
          positiveImpactFactor: 0.3,
          negativeImpactFactor: 0.2,
        }
      });
    });
    Xmatch.bucketUpdate(Xmatch.Spla2, players);
  }

  static processSpla3Match(players) {
    const matchGroupKeys = getMatchGroupKeys(players, Xmatch.Spla3, 3000, 2000, 2000);
    const groups = matchGroupKeys.flatMap(mgk => getMatches(mgk, Xmatch.Spla3, {
      matchAlgo: Xmatch.LimitRateMatch,
      limitRateDiff: 500,
    }));
    groups.forEach(grp => {
      const teams = group2Team(grp, Xmatch.Spla3, Math.random() > 0.5);
      executeMatch(teams, {
        gameVer: Xmatch.Spla3,
        ratingParam: {
          isFT3: true,
          isGuarantee: true,
        },
        matchingConfig: {
          connectionErrorRate: 0.5
        },
        battleBalance: {
          positiveImpactFactor: 0.3,
          negativeImpactFactor: 0.2,
        }
      });
    });
    Xmatch.bucketUpdate(Xmatch.Spla2, players);
  }

  static processCustomMatch(players, matchingConfig, ratingParam, battleBalance) {
    const matchGroupKeys = getMatchGroupKeys(players, Xmatch.Custom, matchingConfig.countStop, matchingConfig.splitRankN, matchingConfig.splitXpN);
    const groups = matchGroupKeys.flatMap(mgk => getMatches(mgk, Xmatch.Custom, matchingConfig));
    groups.forEach(grp => {
      const teams = group2Team(grp, Xmatch.Custom, fairSplitTeam);
      executeMatch(teams, { gameVer: Xmatch.Custom, matchingConfig, ratingParam, battleBalance });
    });
    Xmatch.bucketUpdate(Xmatch.Spla2, players);
  }

}

function executeMatch(teams, opts) {
  const { gameVer } = opts;
  const { isFT3, isGuarantee } = opts.ratingParam;
  const { connectionErrorRate } = opts.matchingConfig;
  const { positiveImpactFactor, negativeImpactFactor } = opts.battleBalance;

  // glicko2は1vs1で対戦するレーティングシステムのため、各チームの平均ステータスを持つ仮想プレイヤーを作成して計算をする
  const teamsWithStats = teams.map(team => ({
    // 真の実力は±N%のブレが存在すると考えて計算する。ブレはプレイヤーによって異なる。
    trueRating: average(team.map(_ => _.trueRating * (1 + _.performanceBias * 2 * Math.random() - _.performanceBias))),
    xp: average(team.map(_ => _.xps[gameVer])),
    rd: average(team.map(_ => _.rds[gameVer])),
    vol: average(team.map(_ => _.vols[gameVer])),
  }));

  // スプラのXPではなく内部レート(真の実力と仮定)を元に勝率を計算する
  // 勝敗は部屋の平均パワーから離れているプレイヤーの影響を大きくする
  // 例えば極端に弱いプレイヤーがいるチームは負けやすくなり、極端に強いプレイヤーがいるほうが勝ちやすくなる
  const adjustImpact = ratingDifference => ratingDifference >= 0
    ? positiveImpactFactor * ratingDifference : -negativeImpactFactor * ratingDifference;

  teamsWithStats.forEach((team, idx) => {
    team.actualPower = team.trueRating + sum(teams[idx].map(_ => adjustImpact(_.trueRating - team.trueRating)));
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
      player.battle(gameVer, teamsWithStats[winTeamIdx - 0], teamsWithStats[1 - winTeamIdx], isFT3, isGuarantee);
    });
    return;
  }

  teams.forEach((team, idx) => {
    team.forEach(player => {
      player.battle(gameVer, teamsWithStats[idx - 0], teamsWithStats[1 - idx], isFT3, isGuarantee);
    });
  });
}

function group2Team(grp, gameVer, fairSplitTeam) {
  const teams = [[], []];
  if (fairSplitTeam) {
    grp.sort((a, b) => Math.min(b.xps[gameVer]) - Math.min(a.xps[gameVer]));
  } else {
    grp.shuffle();
  }
  teams[0].push(grp[0], grp[3], grp[4], grp[7]);
  teams[1].push(grp[1], grp[2], grp[5], grp[6]);
  return teams;
}


function getMatchGroupKeys(players, gameVer, splitRankN, splitXpN, countStop) {
  let matchGroupKeys = [];
  // keys = [1025,1050,1075,1100,1150,...]
  // Sep単位で、プレイヤーが存在するレート帯ごとに格納されている
  const keys = Object.keys(Xmatch.matchBucket[gameVer]).map(Number);
  keys.sort((a, b) => b - a);
  // 1. 指定XP以上を同一XPとみなす
  if (countStop > 0 && (countStop > keys[0])) {
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] < countStop) {
        // keys[i - 1]を基準にして、前のレート帯のプレイヤーをまとめる。keys[i]はすでに含まれているので(i-1)でよい
        for (let j = 0; j < (i - 1); j++) {
          Xmatch.matchBucket[gameVer][keys[i - 1]].push(...Xmatch.matchBucket[gameVer][keys[j]]);
        }
        break;
      }
    }
  }

  // 2. 指定順位で区切る
  if (splitRankN > 0 && (players.length > splitRankN)) { // マッチングをN位以内で区切る場合
    let sum = 0;
    for (let i = 0; i < keys.length; i++) {
      sum += Xmatch.matchBucket[gameVer][keys[i]].length;
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

function getMatches(matchGroupKeys, gameVer, matchingConfig) {
  return (matchingConfig.matchAlgo === Xmatch.LimitRateMatch) ? limitRateMatch(matchGroupKeys, matchingConfig) :
    (matchingConfig.matchAlgo === Xmatch.SequentialMatch) ? sequentialMatch(matchGroupKeys) : sequentialMatch(matchGroupKeys);

  // 指定したレート範囲でランダムに選ばれたメンバーでマッチングをする
  function limitRateMatch(matchGroupKeys, matchingConfig) {
    const groups = [];
    // マッチング区切り処理を追加したい
    const { limitRateDiff } = matchingConfig;
    matchGroupKeys.sort((a, b) => b - a); // 不要かも　負荷次第で消す

    let currentGroup = [];
    const idxStep = parseInt(limitRateDiff / Xmatch.bucketSep);
    // TODO 運が悪いと試合できない人が出てくるけど許容?

    for (let i = 0; i < matchGroupKeys.length; i++) {
      const key = matchGroupKeys[i];
      if (!Xmatch.matchBucket[gameVer][key]) continue;
      currentGroup = [];
      currentGroup.push(Xmatch.matchBucket[gameVer][key].shift());
      if (Xmatch.matchBucket[gameVer][key].length == 0) {
        Xmatch.matchBucket[gameVer][key] = null;
      }
      let nextKeys = range(idxStep).map(_ => key + _ * Xmatch.bucketSep).filter(key => Xmatch.matchBucket[gameVer][key]);
      for (let j = 0; j < 7; j++) {
        if (nextKeys.length == 0) break;
        const nextKey = Math.floor(nextKeys.length * Math.random());
        currentGroup.push(Xmatch.matchBucket[gameVer][nextKeys[nextKey]].shift());
        if (Xmatch.matchBucket[gameVer][nextKeys[nextKey]]?.length == 0) {
          Xmatch.matchBucket[gameVer][nextKeys[nextKey]] = null;
          nextKeys = range(idxStep).map(_ => _ * Xmatch.bucketSep).filter(key => Xmatch.matchBucket[gameVer][key]);
        }
      }
      if (currentGroup.length === 8) {
        groups.push(currentGroup);
      } else {
        currentGroup = [];
      }
      if (Xmatch.matchBucket[gameVer][key]) i--;
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
      for (let i = 0, len = Xmatch.matchBucket[gameVer][k].length; i < len; i++) {
        const player = Xmatch.matchBucket[gameVer][k][i];
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
