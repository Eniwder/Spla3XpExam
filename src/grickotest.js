const { Glicko2 } = require('glicko2');
function toFixedNumber(v, decimals) {
  return v.toFixed(decimals);
}

const ranking = new Glicko2({
  // tau : "Reasonable choices are between 0.3 and 1.2, though the system should
  //      be tested to decide which value results in greatest predictive accuracy."
  // If not set, default value is 0.5
  tau: 0.5,

  // rating : default rating
  // If not set, default value is 1500
  rating: 2500,

  // rd : Default rating deviation
  //     small number = good confidence on the rating accuracy
  // If not set, default value is 350
  rd: 200,

  // vol : Default volatility (expected fluctation on the player rating)
  // If not set, default value is 0.06
  vol: 0.06,
});

// Create players
const xp = 2548;
const Ryan = ranking.makePlayer(xp, 50, 0.16);
const Bob = ranking.makePlayer(2500, 50, 0.06);
const John = ranking.makePlayer(1550, 100, 0.06);
const Mary = ranking.makePlayer(1700, 300, 0.06);


const matches = [];

// matches.push([Ryan, Bob, 1]); //Ryan won over Bob
// matches.push([Ryan, Bob, 1]); //Ryan won over Bob
// matches.push([Ryan, Bob, 0]); //Ryan won over Bob
matches.push([Ryan, Bob, 0]); //Ryan won over Bob
// matches.push([Ryan, Bob, 0]); //Ryan won over Bob
// matches.push([Ryan, Bob, 0]); //Ryan won over Bob

// matches.push([Ryan, John, 0]); //Ryan lost against John
// matches.push([Ryan, Mary, 0.5]); //A draw between Ryan and Mary
// matches.push([John, Mary, 1]); //A draw between Ryan and Mary

// ranking.updateRatings(matches);
console.log(ranking.predict(Ryan, Bob));
ranking.updateRatings(matches);
// ranking.updateRatings(matches);
// ranking.updateRatings(matches);


console.log("Ryan new rating: " + toFixedNumber(Ryan.getRating(), 1) + "\t" + toFixedNumber(Ryan.getRating() - xp, 1));
console.log("Ryan new rating deviation: " + Ryan.getRd());
console.log("Ryan new volatility: " + Ryan.getVol());

const expected = ranking.predict(Ryan, Bob); // or Ryan.predict(Bob);
console.log("Ryan has " + (expected * 100) + "% chances of winning against Bob in the next match");
