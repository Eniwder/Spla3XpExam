import { Player } from "./Player.js";

export class Xmatch {

  static LimitRateMatch = 'limitRateMatch';
  static SequentialMath = 'sequentialMatch';

  static processSpla2Match(players) {
    const matchGroups = getMatchGroups(players, 0, 0);
    const groups = matchGroups.flatMap(_ => getMatches(_, Xmatch.Se, 300, 10000));
    groups.forEach(grp => {
      const teams = group2Team(grp, Math.random() > 0.5);
      executeMatch(teams, { gameVer: Player.Spla2, isFT3: false, isGuarantee: false, connectionErrorRate: 0.5 });
    });
  }

  static processSpla3Match(players) {
    const matchGroups = getMatchGroups(players, 2000, 2000);
    const groups = matchGroups.flatMap(_ => getMatches(_, Xmatch.LimitRateMatch, 500, 3000));
    groups.forEach(grp => {
      const teams = group2Team(grp, Math.random() > 0.5);
      executeMatch(teams, { gameVer: Player.Spla3, isFT3: true, isGuarantee: true, connectionErrorRate: 0.5 });
    });
  }

  static processCustomMatch(players, matchingConfig, ratingParam) {
    const { splitRankN, splitXpN, fairSplitTeam, countStop, matchAlgo, limitRateDiff, connectionErrorRate } = matchingConfig;
    const { isFT3, isGuarantee } = ratingParam;
    const matchGroups = getMatchGroups(players, splitRankN, splitXpN);
    const groups = matchGroups.flatMap(_ => getMatches(_, matchAlgo, limitRateDiff, countStop));
    groups.forEach(grp => {
      const teams = group2Team(grp, fairSplitTeam);
      executeMatch(teams, { gameVer: Player.Custom, isFT3, isGuarantee, connectionErrorRate });
    });
  }

}

function executeMatch(teams, opts) {
  const { gameVer, isFT3, isGuarantee, connectionErrorRate } = opts;

  // glicko2は1vs1で対戦するレーティングシステムのため、各チームの平均ステータスを持つ仮想プレイヤーを作成して計算をする
  const teamsWithStats = teams.map(team => ({
    // 真の実力は±N%のブレが存在すると考えて計算する。ブレはプレイヤーによって異なる。
    trueRating: average(team.map(_ => _.trueRating * (1 + _.performanceBias * 2 * Math.random() - _.performanceBias))),
    xp: average(team.map(_ => _.xp)),
    rd: average(team.map(_ => _.rd)),
    vol: average(team.map(_ => _.vol)),
  }));

  // スプラのXPではなく内部レート(真の実力と仮定)を元に勝率を計算する
  // 勝敗は部屋の平均パワーから離れているプレイヤーの影響を大きくする
  // 例えば極端に弱いプレイヤーがいるチームは負けやすくなり、極端に強いプレイヤーがいるほうが勝ちやすくなる
  const adjustImpact = ratingDifference => ratingDifference >= 0
    ? positiveImpactFactor * ratingDifference : -negativeImpactFactor * ratingDifference;

  teamsWithStats.forEach((team, idx) => {
    team.actualPower = team.trueRating + sum(teams[idx].map(_ => adjustImpact(_.trueRating - team.trueRating)));
    predictPool[idx].setRating(team.actualPower);
    predictPool[idx].setRd(team.rd);
    predictPool[idx].setVol(team.vol);
  });

  const expected = ranking4Tmp.predict(predictPool[0], predictPool[1]);
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
      player.battle(teamsWithStats[winTeamIdx - 0], teamsWithStats[1 - winTeamIdx], gameVer);
    });
    return;
  }

  teams.forEach((team, idx) => {
    team.forEach(player => {
      player.battle(gameVer, teamsWithStats[idx - 0], teamsWithStats[1 - idx], isFT3, isGuarantee);
    });
  });
}

function group2Team(_, fairSplitTeam) {
  const teams = [[], []];
  if (fairSplitTeam) {
    _.sort((a, b) => Math.min(a.xp) - Math.min(b.xp));
  } else {
    _.shuffle();
  }
  teams[0].push(_[0], _[3], _[4], _[7]);
  teams[1].push(_[1], _[2], _[5], _[6]);
  return teams;
}


function getMatchGroups(players, splitRankN, splitXpN) {
  let matchGroups = [];
  if (splitRankN > 0 && (players.length > splitRankN)) { // マッチングをN位以内で区切る場合
    players.sort((a, b) => b.xp - a.xp);
    matchGroups.push(players.slice(0, 2000));
    matchGroups.push(players.slice(2000));
  } else {
    matchGroups.push(players);
  }
  if (splitXpN > 0) { // マッチングを指定XPで区切る場合
    matchGroups = matchGroups.flatMap(_ => _.reduce((acc, v) => {
      acc[v.xp >= splitXpN ? 0 : 1].push(v);
      return acc;
    }, [[], []]));
  }
  return matchGroups;
}

function getMatches(players, matchAlgo, limitRateDiff) {
  const groups = [];

  return (matchAlgo === Xmatch.LimitRateMatch) ? limitRateMatch(players, limitRateDiff) :
    (matchAlgo === Xmatch.SequentialMath) ? sequentialMath(players) : sequentialMath(players);

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
      maxXp = Math.min(countStop, players[i].xp);
      minXp = Math.min(countStop, players[i].xp);
      for (let j = i + 1; j < players.length; j++) {
        if (groupedIdx[j]) continue;
        const tmpXp = Math.min(countStop, players[j].xp);
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
  function sequentialMath(players) {
    players.sort((a, b) => b.xp - a.xp);
    // 最下位付近は試合できない人が出てくるけど許容
    for (let i = 0, max = parseInt(players.length / 8); i < max; i++) {
      groups.push(players.slice(i * 8, (i + 1) * 8));
    }
    return groups;
  }
}
