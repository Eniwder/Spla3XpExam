const boxmuller = require('box-muller');
const { Glicko2 } = require('glicko2');
const crypto = require("crypto");

const sum = array => array.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
const range = n => Array.from(Array(n), (v, k) => k);
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

const XpAvg = 2000;
const PlayerNum = 1000;
const Sd = 250;
const Rd = 200;
const Vol = 0.06;
const scalingFactor = 173.7178;
const logHistory = true;
const splitRank2000 = true;
const splitXp2000 = true;


class Player {
  constructor() {
    this.trueRating = XpAvg + Sd * boxmuller();     // プレイヤーの実際のレーティング
    this.xp = XpAvg + (this.trueRating - XpAvg) * 0.5;     // プレイヤーのスプラ3レーティング。実際のレーティングに少し近い値を入れておく
    this.rd = Rd; // レーティングの不確実性
    this.vol = Vol; // ボラティリティ
    this.gameResults = [];
    this.gameResults4Stats = [];
    this.history = [];
    this.ranking = new Glicko2({
      tau: 0.5,
      rating: XpAvg,
      rd: 200,
      vol: 0.06,
    });
    this.ranking4Stats = new Glicko2({
      tau: 0.5,
      rating: XpAvg,
      rd: 200,
      vol: 0.06,
    });
    this.myself = this.ranking.makePlayer(XpAvg, this.rd, this.vol);
    this.myself4Stats = this.ranking4Stats.makePlayer(this.xp, this.rd, this.vol);
    this.id = crypto.randomUUID();
  }

  toString() {
    return `ID: ${this.id}
XP: ${('' + this.xp).slice(0, 5)}\tTRate: ${('' + this.trueRating).slice(0, 5)}
RD: ${('' + this.rd).slice(0, 4)} vol: ${('' + this.vol).slice(0, 5)}`;
  }


  battle(myTeam, opponentTeam, expected, isWin) {
    this.myself.__rating = (myTeam.xp - XpAvg) / scalingFactor;
    const ranking = new Glicko2({
      tau: 0.5,
      rating: XpAvg,
      rd: 200,
      vol: 0.06,
    });
    const oxp = opponentTeam.xp;
    opponentTeam = ranking.makePlayer(opponentTeam.xp, opponentTeam.rd, opponentTeam.vol);
    // history用に各種パラメーターを追加しておく
    opponentTeam.expected = expected;
    opponentTeam.myTeamXp = myTeam.xp;
    opponentTeam.xp = oxp;
    this.gameResults.push([this.myself, opponentTeam, isWin]);
    this.gameResults4Stats.push([this.myself4Stats, opponentTeam, isWin]);
    const setStat = Math.abs(sum(this.gameResults.map(_ => _[2] ? 1 : -1)));
    if (setStat >= 3 || (this.gameResults.length >= 4 && setStat >= 2) || (this.gameResults.length >= 5)) {
      this.finishSet();
    }
  }

  finishSet() {
    if (logHistory) {
      this.history.push(
        this.gameResults.map((battle, idx) => ({
          set: this.history.length,
          round: idx,
          xp: this.xp,
          teamXp: battle[1].myTeamXp,
          opponentXp: battle[1].xp,
          expected: battle[1].expected,
          result: !!battle[2],
          rd: this.rd,
          vol: this.vol,
        }))
      );
    }
    this.ranking.updateRatings(this.gameResults);
    this.ranking4Stats.updateRatings(this.gameResults4Stats);
    const diffSum = sum(this.gameResults.map(_ => _[0].getRating() - this.xp));
    const winNum = this.gameResults.filter(_ => _[2]).length - this.gameResults.filter(_ => !_[2]).length;
    this.updateRate(winNum, diffSum);
    // console.log(this.rd, "->", this.myself4Stats.getRd());
    this.rd = this.myself4Stats.getRd();
    this.vol = this.myself4Stats.getVol();
    // 少し冗長だけど、このタイミングで上書きで記録する
    if (logHistory) {
      const lastItem = this.history.last().last();
      // console.log(lastItem);
      lastItem.xp = this.xp;
      lastItem.rd = this.rd;
      lastItem.vol = this.vol;
    }

    this.gameResults = [];
    this.gameResults4Stats = [];
    this.ranking4Stats.removePlayers();
    this.myself4Stats = this.ranking4Stats.makePlayer(this.xp, this.rd, this.vol);
  }

  updateRate(winNum, diffSum) {
    const addRatexp = (this.xp < 2500) ? winNum * 25 :
      (this.xp < 3000) ? winNum * 15 :
        winNum * 5 + ((winNum > 0 ? 1 : -1) * 5);
    const addMin = Math.max(Math.abs(addRatexp), Math.abs(diffSum)) ? addRatexp : diffSum;
    this.xp += addMin;
  }
}



// プレイヤー生成
const players = range(PlayerNum)
  .map(_ => new Player())
  .sort((a, b) => a.trueRating - b.trueRating);

let player = players[parseInt(Math.random() * players.length)];
console.log(player.toString());

// 試合をまわす
const ranking4Dummy = new Glicko2({
  tau: 0.5,
  rating: XpAvg,
  rd: 200,
  vol: 0.06,
});
for (let i = 0; i < 500; i++) {
  let matchGroups = [];
  if (splitRank2000) { // マッチングを2000位以内で区切る場合
    players.sort((a, b) => b.xp - a.xp);
    matchGroups.push(players.slice(0, 2000));
    matchGroups.push(players.slice(2000));
  } else {
    matchGroups.push(players);
  }
  if (splitXp2000) { // マッチングをXP2000未満で区切る場合
    matchGroups = matchGroups.flatMap(_ => [_.filter(_ => _.xp >= 2000), _.filter(_ => _.xp < 2000)]);
  }

  const groups = matchGroups.flatMap(_ => getMatches(_));


  groups.forEach(_ => {
    // チーム分けも設定できるようにする
    const shuffleMem = shuffle(_);
    const teamA = shuffleMem.slice(0, 4);
    const teamB = shuffleMem.slice(4);
    const statsTeamA = {
      xp: average(teamA.map(_ => _.xp)),
      rd: average(teamA.map(_ => _.rd)),
      vol: average(teamA.map(_ => _.vol))
    };
    const statsTeamB = {
      xp: average(teamB.map(_ => _.xp)),
      rd: average(teamB.map(_ => _.rd)),
      vol: average(teamB.map(_ => _.vol))
    };

    ranking4Dummy.removePlayers();
    // スプラ3のXPではなく内部レート(真の実力と仮定)を元に勝率を計算する
    const dummyTeamA = ranking4Dummy.makePlayer(average(teamA.map(_ => _.trueRating)), statsTeamA.rd, statsTeamA.vol);
    const dummyTeamB = ranking4Dummy.makePlayer(average(teamB.map(_ => _.trueRating)), statsTeamB.rd, statsTeamB.vol);
    const expected = ranking4Dummy.predict(dummyTeamA, dummyTeamB);

    const isWinA = expected > Math.random() ? 1 : 0;
    teamA.forEach(_ => {
      _.battle(statsTeamA, statsTeamB, expected, isWinA);
    });
    teamB.forEach(_ => {
      _.battle(statsTeamB, statsTeamA, expected, 1 - isWinA);
    });
  });
}

function getMatches(players) {
  const groups = [];
  const playerNum = players.length;

  return limitRateMatch(players, 500);
  return getRankSuitMatch();

  function limitRateMatch(players, limit) {
    shuffle(players);
    let currentGroup = [];
    let groupedIdx = [];
    let maxXp = 0, minXp = 0;
    for (let i = 0; i < players.length; i++) {
      if (groupedIdx[i]) continue;
      currentGroup = [];
      currentGroup.push(players[i]);
      maxXp = players[i].xp;
      minXp = players[i].xp;
      for (let j = i + 1; j < players.length; j++) {
        if (groupedIdx[j]) continue;
        const xpDiff = Math.max(Math.abs(maxXp - players[j].xp), Math.abs(minXp - players[j].xp));
        if (xpDiff <= limit) {
          currentGroup.push(players[j]);
          groupedIdx[j] = true;
          maxXp = Math.max(maxXp, players[j].xp);
          minXp = Math.min(minXp, players[j].xp);
        }
        if (currentGroup.length == 8) {
          groups.push(currentGroup);
          break;
        }
      }
    }
    return groups;
  }

  function rankSuitMatch() {
    players.sort((a, b) => a.rating - b.rating);
    for (let i = 0; i < (PlayerNum / 8); i++) {
      matches.push(players.slice(i * 8, (i + 1) * 8));
    }
    return groups;
  }
}

player.history.forEach(set => {
  console.log(`[set: ${set[0].set}] ${set.filter(_ => _.result).length}-${set.filter(_ => !_.result).length} ${set.last().result ? 'Win' : 'Lose'}`);
  console.log(`XP: ${('' + set[0].xp).slice(0, 6)} -> ${('' + set.last().xp).slice(0, 6)}\tRD:${('' + set.last().rd).slice(0, 4)}`);
  set.forEach(battle => {
    console.log(`  ${battle.result ? 'Win' : 'Lose'} - ${('' + battle.teamXp).slice(0, 6)} vs ${('' + battle.opponentXp).slice(0, 6)} [${('' + battle.expected * 100).slice(0, 2)}%]`);
  });
  console.log();
});

console.log(player.toString());
