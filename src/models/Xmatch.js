import { Player } from "./Player.js";
import { Glicko2 } from 'glicko2';

export class Xmatch {

  static LimitRateMatch = 'limitRateMatch';
  static SequentialMatch = 'sequentialMatch';

  static ranking4Tmp = null;
  static predictPool = null;

  static matchBucket = [[], [], []];
  static bucketSep = 25;

  static init(glicko2Settings) {
    Xmatch.ranking4Tmp = new Glicko2(glicko2Settings);
    Xmatch.predictPool = range(2).map(_ => Xmatch.ranking4Tmp.makePlayer());
  }

  static processSpla2Match(players) {
    const matchGroups = getMatchGroups(players, Player.Spla2, 0, 0);
    console.time('grping');
    const groups = matchGroups.flatMap(_ => getMatches(_, Player.Spla2, Xmatch.SequentialMatch, 300, 10000));
    console.timeEnd('grping');
    groups.forEach(grp => {

      const teams = group2Team(grp, Player.Spla2, Math.random() > 0.5);
      executeMatch(teams, {
        gameVer: Player.Spla2,
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
  }

  static processSpla3Match(players) {
    const matchGroups = getMatchGroups(players, Player.Spla3, 2000, 2000);
    const groups = matchGroups.flatMap(_ => getMatches(_, Player.Spla3, Xmatch.LimitRateMatch, 500, 3000));
    groups.forEach(grp => {
      const teams = group2Team(grp, Player.Spla3, Math.random() > 0.5);
      executeMatch(teams, {
        gameVer: Player.Spla3,
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
  }

  static processCustomMatch(players, matchingConfig, ratingParam, battleBalance) {
    const { splitRankN, splitXpN, fairSplitTeam, countStop, matchAlgo, limitRateDiff } = matchingConfig;
    const matchGroups = getMatchGroups(players, Player.Custom, splitRankN, splitXpN);
    const sorted = (splitRankN > 0 && (players.length > splitRankN));
    const groups = matchGroups.flatMap(_ => getMatches(_, Player.Custom, matchAlgo, limitRateDiff, countStop, sorted));
    groups.forEach(grp => {
      const teams = group2Team(grp, Player.Custom, fairSplitTeam);
      executeMatch(teams, { gameVer: Player.Custom, matchingConfig, ratingParam, battleBalance });
    });
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
  if (connectionErrorRate > Math.random()) {
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
      const bucket = Math.min((player.xps[gameVer] - (player.xps[gameVer] % Xmatch.bucketSep)), 0);
      Xmatch.matchBucket[gameVer][bucket] = player;
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

function getMatches(players, gameVer, matchAlgo, limitRateDiff, countStop, sorted) {
  let groups = [];

  return (matchAlgo === Xmatch.LimitRateMatch) ? limitRateMatch(players, limitRateDiff, countStop) :
    (matchAlgo === Xmatch.SequentialMatch) ? sequentialMatch(players, sorted) : sequentialMatch(players, sorted);

  // 指定したレート範囲でランダムに選ばれたメンバーでマッチングをする
  function limitRateMatch(players, limit, countStop) {
    players.shuffle();
    let currentGroup = [];
    let groupedIdx = [];
    let maxXp = 0, minXp = 0;
    // 運が悪いと試合できない人が出てくるけど許容
    for (let i = 0; i < players.length; i++) {
      if (groupedIdx[i]) continue;
      currentGroup = [];
      currentGroup.push(players[i]);
      maxXp = Math.min(countStop, players[i].xps[gameVer]);
      minXp = Math.min(countStop, players[i].xps[gameVer]);
      for (let j = i + 1; j < players.length; j++) {
        if (groupedIdx[j]) continue;
        const tmpXp = Math.min(countStop, players[j].xps[gameVer]);
        const xpDiff = Math.max(Math.abs(maxXp - tmpXp), Math.abs(minXp - tmpXp));
        if (xpDiff <= limit) {
          currentGroup.push(players[j]);
          groupedIdx[j] = true;
          maxXp = Math.max(maxXp, tmpXp);
          minXp = Math.min(minXp, tmpXp);
        }
        if (currentGroup.length == 8) {
          groups.push(currentGroup);
          break;
        }
      }
    }
    return groups;
  }

  // 上位から8人ずつマッチングしていく
  function sequentialMatch(players, sorted) {
    if (!sorted) players.sort((a, b) => b.xps[gameVer] - a.xps[gameVer]);
    // 最下位付近は試合できない人が出てくるけど許容
    for (let i = 0, max = Math.floor(players.length / 8); i < max; i++) {
      groups.push(players.slice(i * 8, (i + 1) * 8));
    }
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
