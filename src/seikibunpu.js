const boxmuller = require('box-muller');
const { Glicko2 } = require('glicko2');
const crypto = require("crypto");

const sum = array => array.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
const range = n => Array.from(Array(n), (v, k) => k);
const toInRange = (min, v, max) => Math.max(Math.min(max, v), min);
Array.prototype.last = function () {
  if (this.length < 1) return undefined;
  return this[this.length - 1];
};
Array.prototype.shuffle = function () {
  for (let i = this.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [this[i], this[j]] = [this[j], this[i]];
  }
  return this; // 元の配列を返す
};
function average(array) {
  if (array.length === 0) return NaN;
  const sum = array.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
  return sum / array.length;
}
function toFixedNumber(v, decimals) {
  return v.toFixed(decimals);
}

const XpAvg = 2000;
const PlayerNum = 2000;
const defaultSd = 240; // 大体　1000～3000の空間になる。適正3000場合はスプラ2でも当然XP3000を超える。
const defaultRd = 200;
const defaultVol = 0.05;
const defaultTau = 0.5;
const logHistory = true;
const splitRankN = 0;
const splitXp2000 = true;
const isGuarantee = true;
const isFT3 = true;
const fairSplitTeam = false;
const countStop = 3000;
const positiveImpactFactor = 0.3;  // 平均より強いプレイヤーの影響度 TODO このへんは、スプラ2の方式でXP3100のプレイヤーがスプラ3の方式でXP5000になるよう調整する
const negativeImpactFactor = 0.2;  // 平均より弱いプレイヤーの影響度
const LimitRateMatch = "limitRateMatch";
const matchAlgo = LimitRateMatch;
const targetPlayerRate = 3200;

const ranking = new Glicko2({ tau: defaultTau, rating: XpAvg, rd: defaultRd, vol: defaultVol });
const ranking4Tmp = new Glicko2({ tau: defaultTau, rating: XpAvg, rd: defaultRd, vol: defaultVol });
const teamPool = range(5).map(_ => [ranking.makePlayer(), ranking.makePlayer()]);
const predictPool = range(2).map(_ => ranking4Tmp.makePlayer());

class Player {
  constructor(trueRating) {
    this.id = crypto.randomUUID();
    this.trueRating = trueRating || XpAvg + defaultSd * boxmuller();     // プレイヤーの実際のレーティング
    this.xp = XpAvg + (this.trueRating - XpAvg) * 0.5;     // プレイヤーのスプラ3レーティング。実際のレーティングに少し近い値を入れておく
    this.rd = defaultRd; // レーティングの不確実性
    this.vol = defaultVol; // ボラティリティ
    this.gameResults = [];
    this.history = [];
  }

  toString() {
    return `ID: ${this.id}
  XP: ${toFixedNumber(this.xp, 1)}\tTRate: ${toFixedNumber(this.trueRating, 1)}
  RD: ${toFixedNumber(this.rd, 1)} vol: ${toFixedNumber(this.vol, 2)}`;
  }

  battle(myTeam, opponentTeam) {
    // TODO レート計算の時は、「自身のXP、RD,vol」で増減を判断する。(実際の分布で試すまで未定)
    // 普通に考えるとチームの平均XPで増減を決める方が公平だが、スプラ3でXP5000から[2-3]のスコアで-600などを再現しようとすると、
    // RDを180くらいに高める必要があり、そのためには個人のXPで計算しないと辻褄が合わない。　

    // 後でまとめて差を計算できるように各種パラメーターを追加しておく
    myTeam.xp = myTeam.xp;
    myTeam.myXp = this.xp;
    myTeam.myRd = this.rd;
    myTeam.myVol = this.vol;

    // 1セットの結果を元にXPを更新する(1セットの間の勝敗でXP,RD,volは変動させない)
    this.gameResults.push([myTeam, opponentTeam]);

    if (isFinishSet(this.gameResults)) {
      this.finishSet();
    }

    function isFinishSet(gameResults) {
      if (!isFT3) return true;
      const scoreDiff = Math.abs(sum(gameResults.map(_ => !!_[0].isWin ? 1 : -1)));
      return (gameResults.length + scoreDiff) >= 6; // 3試合先取の場合、(試合数+勝敗の差)が6以上でセット終了と判断できる
    }
  }

  finishSet() {
    const gameResult4Stats = this.gameResults.map((team, idx) => {
      teamPool[idx][0].setRating(team[0].myXp);
      teamPool[idx][0].setRd(team[0].myRd);
      teamPool[idx][0].setVol(team[0].myVol);
      teamPool[idx][1].setRating(team[1].xp);
      teamPool[idx][1].setRd(team[1].rd);
      teamPool[idx][1].setVol(team[1].vol);
      return [teamPool[idx][0], teamPool[idx][1], team[0].isWin];
    });
    ranking.updateRatings(gameResult4Stats);

    gameResult4Stats.forEach((_, idx) => {
      this.gameResults[idx][0].nextXp = _[0].getRating();
      this.gameResults[idx][0].nextRd = _[0].getRd();
      this.gameResults[idx][0].nextVol = _[0].getVol();
    });

    if (logHistory && this.id === targetPlayer.id) {
      this.history.push(
        this.gameResults.map((team, idx) => ({
          setIdx: this.history.length,
          round: idx,
          xp: this.xp,
          teamXp: team[0].xp,
          opponentXp: team[1].xp,
          expected: team[0].expected,
          result: !!team[0].isWin,
          estimateChangeXp: (team[0].nextXp - team[0].myXp),
          rd: this.rd,
          vol: this.vol,
        }))
      );
    }

    // セット終了後、全ての増減を一度に更新する
    const [diffSumXp, diffSumRd, diffSumVol, scoreDiff] = this.gameResults.reduce((acc, v) => {
      acc[0] += (v[0].nextXp - v[0].myXp);
      acc[1] += (v[0].nextRd - v[0].myRd);
      acc[2] += (v[0].nextVol - v[0].myVol);
      acc[3] += (v[0].isWin ? 1 : -1); // 勝ち越しでプラス、負け越しでマイナス
      return acc;
    }, [0, 0, 0, 0]);

    this.xp = Math.max(500, this.xp + this.getAddXp(scoreDiff, diffSumXp)); // XPの最低値は500(スプラ3の仕様)
    this.rd = toInRange(50, this.rd + diffSumRd, 350); // RDは50～350の範囲とする。明確な根拠は無いが、基本的にこの範囲を超えることはない。
    this.vol += diffSumVol;
    if (logHistory && this.id === targetPlayer.id) {
      const lastItem = this.history.last().last();
      lastItem.endXp = this.xp;
      lastItem.endRd = this.rd;
      lastItem.endVol = this.vol;
    }

    this.gameResults = [];
  }

  getAddXp(scoreDiff, diffSum) {
    const addXpByRate = (this.xp < 2500) ? scoreDiff * 25 :
      (this.xp < 3000) ? scoreDiff * 15 :
        scoreDiff * 5 + ((scoreDiff > 0 ? 1 : -1) * 5);

    return !isGuarantee ? diffSum : // 最低保障が無いなら単純に試合ごとの増減を加算する
      scoreDiff < 0 ? Math.min(diffSum, addXpByRate) : // 最低保証がある場合は、「最低保証or単純XP増減」のうち、より変化の大きい方を採用する
        Math.max(diffSum, addXpByRate);
  }
}



// プレイヤー生成
const players = range(PlayerNum)
  .map(_ => new Player());
const targetPlayer = new Player(targetPlayerRate);
players.push(targetPlayer);

// let player = players[parseInt(Math.random() * players.length)]; // for debug
console.log(targetPlayer.toString());

// 試合をまわす
for (let i = 0; i < 1500; i++) {
  let matchGroups = [];
  if (splitRankN > 0 && (players.length > splitRankN)) { // マッチングをN位以内で区切る場合
    players.sort((a, b) => b.xp - a.xp);
    matchGroups.push(players.slice(0, 2000));
    matchGroups.push(players.slice(2000));
  } else {
    matchGroups.push(players);
  }
  if (splitXp2000) { // マッチングをXP2000未満で区切る場合
    matchGroups = matchGroups.flatMap(_ => _.reduce((acc, v) => {
      acc[v.xp >= 2000 ? 0 : 1].push(v);
      return acc;
    }, [[], []]));
  }

  const groups = matchGroups.flatMap(_ => getMatches(_));

  groups.forEach(_ => {
    // TODO チーム分けも設定できるようにする
    const teamA = [];
    const teamB = [];
    if (fairSplitTeam) {
      _.sort((a, b) => a.xp - b.xp);
    } else {
      _.shuffle();
    }
    teamA.push(_[0], _[3], _[4], _[7]);
    teamB.push(_[1], _[2], _[5], _[6]);
    // glicko2は1vs1で対戦するレーティングシステムのため、各チームの平均ステータスを持つ仮想プレイヤーを作成して計算をする
    const statsTeamA = {
      trueRating: average(teamA.map(_ => _.trueRating)),
      xp: average(teamA.map(_ => _.xp)),
      rd: average(teamA.map(_ => _.rd)),
      vol: average(teamA.map(_ => _.vol))
    };
    const statsTeamB = {
      trueRating: average(teamB.map(_ => _.trueRating)),
      xp: average(teamB.map(_ => _.xp)),
      rd: average(teamB.map(_ => _.rd)),
      vol: average(teamB.map(_ => _.vol))
    };

    // スプラ3のXPではなく内部レート(真の実力と仮定)を元に勝率を計算する
    // 勝敗は部屋の平均パワーから離れているプレイヤーの影響を大きくする
    // 例えば極端に弱いプレイヤーがいるチームは負けやすくなり、極端に強いプレイヤーがいるほうが勝ちやすくなる
    const adjustImpact = ratingDifference => ratingDifference >= 0
      ? positiveImpactFactor * ratingDifference : -negativeImpactFactor * ratingDifference;

    const actualPowerA = statsTeamA.trueRating + sum(teamA.map(_ => adjustImpact(_.trueRating - statsTeamA.trueRating)));
    const actualPowerB = statsTeamB.trueRating + sum(teamB.map(_ => adjustImpact(_.trueRating - statsTeamB.trueRating)));

    predictPool[0].setRating(actualPowerA);
    predictPool[0].setRd(statsTeamA.rd);
    predictPool[0].setVol(statsTeamA.vol);
    predictPool[1].setRating(actualPowerB);
    predictPool[1].setRd(statsTeamB.rd);
    predictPool[1].setVol(statsTeamB.vol);

    const expected = ranking4Tmp.predict(predictPool[0], predictPool[1]);
    const isWinA = (expected > Math.random()) ? 1 : 0;
    statsTeamA.expected = expected;
    statsTeamA.isWin = isWinA;
    statsTeamB.expected = 1 - expected;
    statsTeamB.isWin = 1 - isWinA;

    teamA.forEach(_ => {
      _.battle(statsTeamA, statsTeamB);
    });
    teamB.forEach(_ => {
      _.battle(statsTeamB, statsTeamA);
    });
  });
}

function getMatches(players) {
  const groups = [];

  // ***********************
  return matchAlgo == LimitRateMatch ?
    limitRateMatch(players, 500) : rankSuitMatch(players);

  // 指定したレート範囲でランダムに選ばれたメンバーでマッチングをする
  function limitRateMatch(players, limit) {
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
  function rankSuitMatch(players) {
    players.sort((a, b) => b.xp - a.xp);
    // 最下位付近は試合できない人が出てくるけど許容
    // console.log(players.length, parseInt(players.length / 8));
    for (let i = 0, max = parseInt(players.length / 8); i < max; i++) {
      groups.push(players.slice(i * 8, (i + 1) * 8));
    }
    return groups;
  }
}
targetPlayer.history.forEach(set => {
  if (!set.last().result) {
    if (isFT3) console.log(`[Set: ${set[0].setIdx}] ${set.filter(_ => _.result).length}-${set.filter(_ => !_.result).length} ${set.last().result ? 'Win' : 'Lose'}`);
    let diffStr = toFixedNumber(set.last().endXp - set[0].xp, 1);
    diffStr = ((diffStr >= 0 ? '+' : '') + diffStr);
    console.log(`XP: ${toFixedNumber(set[0].xp, 1)} -> ${toFixedNumber(set.last().endXp, 1)} (${diffStr})\t/ RD:${toFixedNumber(set.last().endRd, 1)} v:${toFixedNumber(set.last().endVol, 2)}`);
    set.forEach(battle => {
      console.log(`  ${battle.result ? 'Win ' : 'Lose'}(${toFixedNumber(battle.expected * 100, 0)}%): ${toFixedNumber(battle.teamXp, 1)} vs ${toFixedNumber(battle.opponentXp, 1)} (${(battle.estimateChangeXp > 0 ? '+' : '') + toFixedNumber(battle.estimateChangeXp, 1)})`);
    });

    console.log();
  }
});
// targetPlayer.history.forEach(set => {
//   if (isFT3) console.log(`[Set: ${set[0].set}] ${set.filter(_ => _.result).length}-${set.filter(_ => !_.result).length} ${set.last().result ? 'Win' : 'Lose'}`);
//   let diffStr = toFixedNumber(set.last().endXp - set[0].xp, 1);
//   diffStr = ((diffStr >= 0 ? '+' : '') + diffStr);
//   console.log(`XP: ${toFixedNumber(set[0].xp, 1)} -> ${toFixedNumber(set.last().endXp, 1)} (${diffStr})\t/ RD:${toFixedNumber(set.last().endRd, 1)} v:${toFixedNumber(set.last().endVol, 2)}`);
//   set.forEach(battle => {
//     console.log(`  ${battle.result ? 'Win ' : 'Lose'}(${toFixedNumber(battle.expected * 100, 0)}%): ${toFixedNumber(battle.teamXp, 1)} vs ${toFixedNumber(battle.opponentXp, 1)} (${(battle.estimateChangeXp > 0 ? '+' : '') + toFixedNumber(battle.estimateChangeXp, 1)})`);
//   });

//   console.log();
// });
console.log(`Winning rate: ${toFixedNumber(average(targetPlayer.history.map(set => set.last().result ? 100 : 0)), 1)}%`);
console.log(`Max XP: ${toFixedNumber(Math.max(...targetPlayer.history.map(set => set.last().endXp)), 1)}\tMin XP: ${toFixedNumber(Math.min(...targetPlayer.history.map(set => set.last().xp)), 1)}`);
console.log();

console.log(targetPlayer.toString());
