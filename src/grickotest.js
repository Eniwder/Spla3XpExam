const { Glicko2 } = require('glicko2');

const ranking = new Glicko2({
  // tau : "Reasonable choices are between 0.3 and 1.2, though the system should
  //      be tested to decide which value results in greatest predictive accuracy."
  // If not set, default value is 0.5
  tau: 0.5,

  // rating : default rating
  // If not set, default value is 1500
  rating: 1500,

  // rd : Default rating deviation
  //     small number = good confidence on the rating accuracy
  // If not set, default value is 350
  rd: 200,

  // vol : Default volatility (expected fluctation on the player rating)
  // If not set, default value is 0.06
  vol: 0.06,
});

// Create players
const Ryan = ranking.makePlayer();
const Bob = ranking.makePlayer(1400, 30, 0.06);
const John = ranking.makePlayer(1550, 100, 0.06);
const Mary = ranking.makePlayer(1700, 300, 0.06);

const matches = [];

matches.push([Ryan, Bob, 1]); //Ryan won over Bob
matches.push([Ryan, John, 0]); //Ryan lost against John
matches.push([Ryan, Mary, 0.5]); //A draw between Ryan and Mary

ranking.updateRatings(matches);

console.log("Ryan new rating: " + Ryan.getRating());
console.log("Ryan new rating deviation: " + Ryan.getRd());
console.log("Ryan new volatility: " + Ryan.getVol());

const expected = ranking.predict(Ryan, Bob); // or Ryan.predict(Bob);
console.log("Ryan has " + (expected * 100) + "% chances of winning against Bob in the next match");