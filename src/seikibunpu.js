const boxmuller = require('box-muller');
const { Glicko2 } = require('glicko2');
const crypto = require("crypto");

const sum = array => array.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
const range = n => Array.from(Array(n), (v, k) => k);
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

class Player {
  constructor(trueRating, xp, rd, vol) {
    this.trueRating = trueRating;     // プレイヤーの実際のレーティング
    this.xp = xp;     // プレイヤーのスプラ3レーティング
    this.rd = rd;             // レーティングの不確実性
    this.vol = vol; // ボラティリティ
    this.gameResults = [];
    this.gameResults4Stats = [];
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
    this.myself4Stats = this.ranking4Stats.makePlayer(this.xp, this.rd, this.vol);
    this.myself = this.ranking.makePlayer(XpAvg, this.rd, this.vol);
    this.name = crypto.randomUUID();
  }

  battle(myTeam, opponentTeam, isWin) {
    this.myself.__rating = (myTeam.xp - XpAvg) / scalingFactor;
    const ranking = new Glicko2({
      tau: 0.5,
      rating: XpAvg,
      rd: 200,
      vol: 0.06,
    });
    opponentTeam = ranking.makePlayer(opponentTeam.xp, opponentTeam.rd, opponentTeam.vol);
    this.gameResults.push([this.myself, opponentTeam, isWin]);
    this.gameResults4Stats.push([this.myself4Stats, opponentTeam, isWin]);
    const setStat = Math.abs(sum(this.gameResults.map(_ => _[2] ? 1 : -1)));
    if (setStat >= 3 || (this.gameResults.length >= 4 && setStat >= 2) || (this.gameResults.length >= 5)) {
      this.finishSet();
    }
  }

  finishSet() {
    this.ranking.updateRatings(this.gameResults);
    this.ranking4Stats.updateRatings(this.gameResults4Stats);
    const diffSum = sum(this.gameResults.map(_ => _[0].getRating() - this.xp));
    const winNum = this.gameResults.filter(_ => _[2]).length - this.gameResults.filter(_ => !_[2]).length;
    this.updateRate(winNum, diffSum);
    // console.log(this.rd, "->", this.myself4Stats.getRd());
    this.rd = this.myself4Stats.getRd();
    this.vol = this.myself4Stats.getVol();

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
  .map(_ => new Player(XpAvg + Sd * boxmuller(), XpAvg, Rd, Vol))
  .sort((a, b) => a.trueRating - b.trueRating);

let player = players[parseInt(Math.random() * players.length)];
console.log(player);

// 試合をまわす
const ranking4Dummy = new Glicko2({
  tau: 0.5,
  rating: XpAvg,
  rd: 200,
  vol: 0.06,
});
for (let i = 0; i < 500; i++) {
  players.sort((a, b) => a.xp - b.xp);
  const matchs = [];
  for (let j = 0; j < (PlayerNum / 8); j++) {
    matchs.push(players.slice(j * 8, (j + 1) * 8));
  }

  matchs.forEach(_ => {
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
    const dummyTeamA = ranking4Dummy.makePlayer(average(teamA.map(_ => _.trueRating)), statsTeamA.rd, statsTeamA.vol);
    const dummyTeamB = ranking4Dummy.makePlayer(average(teamB.map(_ => _.trueRating)), statsTeamB.rd, statsTeamB.vol);
    const expected = ranking4Dummy.predict(dummyTeamA, dummyTeamB);

    const isWinA = expected > Math.random() ? 1 : 0;
    teamA.forEach(_ => {
      _.battle(statsTeamA, statsTeamB, isWinA);
    });
    teamB.forEach(_ => {
      _.battle(statsTeamB, statsTeamA, 1 - isWinA);
    });
  });
}

console.log(player);
