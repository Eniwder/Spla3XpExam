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
function shuffle(array) {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
}
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
const Sd = 240; // 大体　1000～3000の空間になる。適正3000場合はスプラ2でも当然XP3000を超える。
const Rd = 200;
const Vol = 0.06;
const Tau = 0.5;
const logHistory = true;
const splitRankN = 0;
const splitXp2000 = true;
const isGuarantee = true;
const isFT3 = true;
const countStop = 3000;
const positiveImpactFactor = 0.7;  // 平均より強いプレイヤーの影響度 TODO このへんは、スプラ2の方式でXP3100のプレイヤーがスプラ3の方式でXP5000になるよう調整する
const negativeImpactFactor = 0.3;  // 平均より弱いプレイヤーの影響度
const LimitRateMatch = "limitRateMatch";
const matchAlgo = LimitRateMatch;
const targetPlayerRate = 3200;

const ranking4Tmp = new Glicko2({
  tau: Tau,
  rating: XpAvg,
  rd: Rd,
  vol: Vol,
});

class Player {
  constructor(trueRating) {
    this.id = crypto.randomUUID();
    this.trueRating = trueRating || XpAvg + Sd * boxmuller();     // プレイヤーの実際のレーティング
    this.xp = XpAvg + (this.trueRating - XpAvg) * 0.5;     // プレイヤーのスプラ3レーティング。実際のレーティングに少し近い値を入れておく
    this.rd = Rd; // レーティングの不確実性
    this.vol = Vol; // ボラティリティ
    this.gameResults = [];
    this.history = [];
    this.ranking = new Glicko2({
      tau: Tau,
      rating: XpAvg,
      rd: Rd,
      vol: Vol,
    });
  }

  toString() {
    return `ID: ${this.id}
  XP: ${toFixedNumber(this.xp, 1)}\tTRate: ${toFixedNumber(this.trueRating, 1)}
  RD: ${toFixedNumber(this.rd, 1)} vol: ${toFixedNumber(this.vol, 2)}`;
  }

  battle(myTeam, opponentTeam, expected, isWin) {
    // レート計算の時は、「チームのレート」と「自身のRD,vol」で増減を判断する
    const myTeamObj = this.ranking.makePlayer(this.xp, this.rd, this.vol);
    // 「ranking.updateRatings」では自身のplayerのみ更新処理が実行されるので、レート更新に不要なデータは処理しない領域でplayerを作る
    const opponentTeamObj = ranking4Tmp.makePlayer(opponentTeam.xp, opponentTeam.rd, opponentTeam.vol);
    ranking4Tmp.removePlayers();
    // 後でまとめて差を計算できるように各種パラメーターを追加しておく
    myTeamObj.xp = this.xp;
    myTeamObj._rd = this.rd;
    myTeamObj._vol = this.vol;
    myTeamObj.expected = expected;
    opponentTeamObj.xp = opponentTeam.xp;

    // 1セットの結果を元にXPを更新する(1セットの間の勝敗でXP,RD,volは変動させない)
    this.gameResults.push([myTeamObj, opponentTeamObj, isWin]);
    const setStat = Math.abs(sum(this.gameResults.map(_ => (_[2] === 1) ? 1 : -1)));
    if (!isFT3 || setStat >= 3 || (this.gameResults.length >= 4 && setStat >= 2) || (this.gameResults.length >= 5)) {
      this.finishSet();
    }
  }

  finishSet() {
    this.ranking.updateRatings(this.gameResults);
    if (logHistory) {
      this.history.push(
        this.gameResults.map((battle, idx) => ({
          set: this.history.length,
          round: idx,
          xp: this.xp,
          teamXp: battle[0].xp,
          opponentXp: battle[1].xp,
          expected: battle[0].expected,
          result: !!battle[2],
          estimateChangeXp: battle[0].getRating() - battle[0].xp,
          rd: this.rd,
          vol: this.vol,
        }))
      );
    }

    // セット終了後、全ての増減を一度に更新する
    const [diffSumXp, diffSumRd, diffSumVol] = this.gameResults.reduce((acc, v) => {
      acc[0] += Number(v[0].getRating() - v[0].xp);
      acc[1] += (v[0].getRd() - v[0]._rd);
      acc[2] += (v[0].getVol() - v[0]._vol);
      return acc;
    }, [0, 0, 0]);

    const winNum = this.gameResults.filter(_ => _[2]).length - this.gameResults.filter(_ => !_[2]).length;
    this.xp = Math.max(500, this.xp + this.getAddXp(winNum, diffSumXp)); // XPの最低値は500(スプラ3の仕様)
    this.rd = toInRange(50, this.rd + diffSumRd, 350); // RDは50～350の範囲とする。明確な根拠は無いが、基本的にこの範囲を超えることはない。
    this.vol += diffSumVol;

    if (logHistory) {
      const lastItem = this.history.last().last();
      lastItem.endXp = this.xp;
      lastItem.endRd = toInRange(50, this.rd, 350);
      lastItem.endVol = this.vol;
    }

    this.gameResults = [];
    this.ranking.removePlayers();
  }

  getAddXp(winNum, diffSum) {
    const addXpByRate = (this.xp < 2500) ? winNum * 25 :
      (this.xp < 3000) ? winNum * 15 :
        winNum * 5 + ((winNum > 0 ? 1 : -1) * 5);

    return !isGuarantee ? diffSum : // 最低保障が無いなら単純に試合ごとの増減を加算する
      winNum < 0 ? Math.min(diffSum, addXpByRate) : // 最低保証がある場合は、「最低保証or単純XP増減」のうち、より変化の大きい方を採用する
        Math.max(diffSum, addXpByRate);
  }
}



// プレイヤー生成
const players = range(PlayerNum)
  .map(_ => new Player());
players.push(new Player(targetPlayerRate)); // 実験用XP3000

// let player = players[parseInt(Math.random() * players.length)]; // for debug
let player = players.sort((a, b) => b.trueRating - a.trueRating)[0];
console.log(player.toString());

// 試合をまわす
for (let i = 0; i < 2000; i++) {
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
    const shuffleMem = shuffle(_);
    const teamA = shuffleMem.slice(0, 4);
    const teamB = shuffleMem.slice(4);
    // glicko2は1vs1で対戦するレーティングシステムのため、各チームの平均ステータスを持つ仮想プレイヤーを作成して計算をする
    const statsTeamA = {
      trueRating: average(teamA.map(_ => _.trueRating)),
      xp: average(teamA.map(_ => _.xp)),
      rd: toInRange(50, average(teamA.map(_ => _.rd)), 350),
      vol: average(teamA.map(_ => _.vol))
    };
    const statsTeamB = {
      trueRating: average(teamB.map(_ => _.trueRating)),
      xp: average(teamB.map(_ => _.xp)),
      rd: toInRange(50, average(teamB.map(_ => _.rd)), 350),
      vol: average(teamB.map(_ => _.vol))
    };

    // スプラ3のXPではなく内部レート(真の実力と仮定)を元に勝率を計算する
    // 勝敗は部屋の平均パワーから離れているプレイヤーの影響を大きくする
    // 例えば極端に弱いプレイヤーがいるチームは負けやすくなり、極端に強いプレイヤーがいるほうが勝ちやすくなる
    const adjustImpact = ratingDifference => ratingDifference >= 0
      ? positiveImpactFactor * Math.sqrt(ratingDifference * ratingDifference)
      : -negativeImpactFactor * Math.sqrt(ratingDifference * ratingDifference);

    const actualPowerA = statsTeamA.trueRating + sum(teamA.map(_ => adjustImpact(_.trueRating - statsTeamA.trueRating)));
    const actualPowerB = statsTeamB.trueRating + sum(teamB.map(_ => adjustImpact(_.trueRating - statsTeamB.trueRating)));

    const dummyTeamA = ranking4Tmp.makePlayer(actualPowerA, statsTeamA.rd, statsTeamA.vol);
    const dummyTeamB = ranking4Tmp.makePlayer(actualPowerB, statsTeamB.rd, statsTeamB.vol);
    const expected = ranking4Tmp.predict(dummyTeamA, dummyTeamB);
    const isWinA = (expected > Math.random()) ? 1 : 0;
    ranking4Tmp.removePlayers();

    teamA.forEach(_ => {
      _.battle(statsTeamA, statsTeamB, expected, isWinA);
    });
    teamB.forEach(_ => {
      _.battle(statsTeamB, statsTeamA, 1 - expected, 1 - isWinA);
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
    shuffle(players);
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
player.history.forEach(set => {
  if (!set.last().result) {
    if (isFT3) console.log(`[Set: ${set[0].set}] ${set.filter(_ => _.result).length}-${set.filter(_ => !_.result).length} ${set.last().result ? 'Win' : 'Lose'}`);
    let diffStr = toFixedNumber(set.last().endXp - set[0].xp, 1);
    diffStr = ((diffStr >= 0 ? '+' : '') + diffStr);
    console.log(`XP: ${toFixedNumber(set[0].xp, 1)} -> ${toFixedNumber(set.last().endXp, 1)} (${diffStr})\t/ RD:${toFixedNumber(set.last().endRd, 1)} v:${toFixedNumber(set.last().endVol, 2)}`);
    set.forEach(battle => {
      console.log(`  ${battle.result ? 'Win ' : 'Lose'}(${toFixedNumber(battle.expected * 100, 0)}%): ${toFixedNumber(battle.teamXp, 1)} vs ${toFixedNumber(battle.opponentXp, 1)} (${(battle.estimateChangeXp > 0 ? '+' : '') + toFixedNumber(battle.estimateChangeXp, 1)})`);
    });

    console.log();
  }
});
// player.history.forEach(set => {
//   if (isFT3) console.log(`[Set: ${set[0].set}] ${set.filter(_ => _.result).length}-${set.filter(_ => !_.result).length} ${set.last().result ? 'Win' : 'Lose'}`);
//   let diffStr = toFixedNumber(set.last().endXp - set[0].xp, 1);
//   diffStr = ((diffStr >= 0 ? '+' : '') + diffStr);
//   console.log(`XP: ${toFixedNumber(set[0].xp, 1)} -> ${toFixedNumber(set.last().endXp, 1)} (${diffStr})\t/ RD:${toFixedNumber(set.last().endRd, 1)} v:${toFixedNumber(set.last().endVol, 2)}`);
//   set.forEach(battle => {
//     console.log(`  ${battle.result ? 'Win ' : 'Lose'}(${toFixedNumber(battle.expected * 100, 0)}%): ${toFixedNumber(battle.teamXp, 1)} vs ${toFixedNumber(battle.opponentXp, 1)} (${(battle.estimateChangeXp > 0 ? '+' : '') + toFixedNumber(battle.estimateChangeXp, 1)})`);
//   });

//   console.log();
// });
console.log(`Winning rate: ${toFixedNumber(average(player.history.map(set => set.last().result ? 100 : 0)), 1)}%`);
console.log(`Max XP: ${toFixedNumber(Math.max(...player.history.map(set => set.last().endXp)), 1)}\tMin XP: ${toFixedNumber(Math.min(...player.history.map(set => set.last().xp)), 1)}`);
console.log();

console.log(player.toString());
