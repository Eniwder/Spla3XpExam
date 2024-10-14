import { Player } from "./Player.js";
import { Glicko2 } from 'glicko2';

export class Xmatch {

  static LimitRateMatch = 'limitRateMatch';
  static SequentialMatch = 'sequentialMatch';

  static Spla2 = 0;
  static Spla3 = 1;
  static Custom = 2;

  static ranking4Tmp = null;
  static predictPool = null;

  static matchBucket = [[], [], []];
  static bucketSep = 25;

  static init(glicko2Settings, players) {
    Xmatch.ranking4Tmp = new Glicko2(glicko2Settings);
    Xmatch.predictPool = range(2).map(_ => Xmatch.ranking4Tmp.makePlayer());
    [Xmatch.Spla2, Xmatch.Spla3, Xmatch.Custom].forEach(gameVer => Xmatch.bucketUpdate(gameVer, players));
  }

  static bucketUpdate(gameVer, players) {
    Xmatch.matchBucket[gameVer] = []; // TODO これをしなければ全員がマッチの機会を得られる？その場合は別途どっかで初期化が必要
    players.forEach(player => {
      const bucket = player.xps[gameVer] - (player.xps[gameVer] % Xmatch.bucketSep);
      if (!Xmatch.matchBucket[gameVer][bucket]) Xmatch.matchBucket[gameVer][bucket] = [];
      Xmatch.matchBucket[gameVer][bucket].push(player);
    });
  }

  static processSpla2Match(players) {
    console.time('grping');
    const groups = getMatches(Xmatch.Spla2, {
      matchAlgo: Xmatch.LimitRateMatch,
      limitRateDiff: 300,
      countStop: 10000,
      splitRankN: 0,
      splitXpN: 0,
    });
    Xmatch.matchBucket[Xmatch.Spla2] = [];
    // console.log(groups);
    console.timeEnd('grping');
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
    const groups = getMatches(Xmatch.Spla3, {
      matchAlgo: Xmatch.LimitRateMatch,
      limitRateDiff: 500,
      countStop: 3000,
      splitRankN: 2000,
      splitXpN: 2000,
    });
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
    const groups = getMatches(Xmatch.Spla3, matchingConfig);
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


function getMatchGroups(players, gameVer, splitRankN, splitXpN) {
  let matchGroups = [];
  if (splitRankN > 0 && (players.length > splitRankN)) { // マッチングをN位以内で区切る場合
    players.sort((a, b) => b.xps[gameVer] - a.xps[gameVer]);
    matchGroups.push(players.slice(0, 2000));
    matchGroups.push(players.slice(2000));
  } else {
    matchGroups.push(players);
  }
  if (splitXpN > 0) { // マッチングを指定XPで区切る場合
    matchGroups = matchGroups.flatMap(_ => _.reduce((acc, v) => {
      acc[v.xps[gameVer] >= splitXpN ? 0 : 1].push(v);
      return acc;
    }, [[], []]));
  }
  return matchGroups;
}

function getMatches(gameVer, matchingConfig) {
  const groups = [];

  return (matchingConfig.matchAlgo === Xmatch.LimitRateMatch) ? limitRateMatch(matchingConfig) :
    (matchingConfig.matchAlgo === Xmatch.SequentialMatch) ? sequentialMatch(matchingConfig) : sequentialMatch(matchingConfig);

  // 指定したレート範囲でランダムに選ばれたメンバーでマッチングをする
  function limitRateMatch(matchingConfig) {

    const { limitRateDiff, countStop } = matchingConfig;
    let currentGroup = [];
    const idxStep = parseInt(limitRateDiff / Xmatch.bucketSep);
    // 運が悪いと試合できない人が出てくるけど許容
    const keys = Object.keys(Xmatch.matchBucket[gameVer]).map(Number);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
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
        // console.log(nextKeys, nextKey);
        currentGroup.push(Xmatch.matchBucket[gameVer][nextKeys[nextKey]].shift());
        if (Xmatch.matchBucket[gameVer][nextKeys[nextKey]]?.length == 0) {
          Xmatch.matchBucket[gameVer][nextKeys[nextKey]] = null;
          nextKeys = range(idxStep).map(_ => _ * Xmatch.bucketSep).filter(key => Xmatch.matchBucket[gameVer][key]);
        }
      }
      // console.log(currentGroup);
      if (currentGroup.length === 8) {
        groups.push(currentGroup);
      }
      if (Xmatch.matchBucket[gameVer][key]) i--;

    }

    return groups;
  }

  // 上位から8人ずつマッチングしていく
  // TODO 最下位付近は試合できない人が出てくるけど許容
  // 処理速度の理由からplayersのsortはしない。つまりbucket単位は同一レートとみなす
  // このマッチング方式ではsplitRankNとsplitRankXは動作しない。区切ったところで誤差が±7人で、十分に無視できる誤差だと思うから
  function sequentialMatch(matchingConfig) {
    const bukects = Object.keys(Xmatch.matchBucket[gameVer]).map(Number).sort((a, b) => b - a);
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
