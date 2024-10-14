export class Player {
  constructor(id, trueRating, xp, rd, vol, performanceBias) {
    this.id = id;//crypto.randomUUID();
    this.trueRating = trueRating;     // プレイヤーの実際のレーティング
    this.xp = xp; // プレイヤーのスプラ3レーティング。実際のレーティングに少し近い値を入れておく
    this.rd = rd; // レーティングの不確実性
    this.vol = vol; // ボラティリティ
    this.performanceBias = performanceBias; // 0 ~ bias
    this.gameResults = [];
    this.history = [];
  }

  toString() {
    return `ID: ${this.id}
  XP: ${toFixedNumber(this.xp, 1)}\tTRate: ${toFixedNumber(this.trueRating, 1)}\tBias: ${toFixedNumber(this.performanceBias, 3)}
  RD: ${toFixedNumber(this.rd, 1)} vol: ${toFixedNumber(this.vol, 2)}`;
  }

  battle(myTeam, opponentTeam) {
    // TODO レート計算の時は、「自身のXP、RD,vol」で増減を判断する。(実際の分布で試すまで未定)
    // 普通に考えるとチームの平均XPで増減を決める方が公平だが、スプラ3でXP5000から[2-3]のスコアで-600などを再現しようとすると、
    // RDを180くらいに高める必要があり、そのためには個人のXPで計算しないと辻褄が合わない。　

    // 後でまとめて差を計算できるように各種パラメーターを追加しておく
    // myTeam.myXp = this.xp; 仮に自分のXPを保存する必要が出た場合、単純にmyTeamにプロパティを追加すると競合する点に注意


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
      teamPool[idx][0].setRating(this.xp);
      teamPool[idx][0].setRd(this.rd);
      teamPool[idx][0].setVol(this.vol);
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
          estimateChangeXp: (team[0].nextXp - this.xp),
          rd: this.rd,
          vol: this.vol,
        }))
      );
    }

    // セット終了後、全ての増減を一度に更新する
    const [diffSumXp, diffSumRd, diffSumVol, scoreDiff] = this.gameResults.reduce((acc, v) => {
      acc[0] += (v[0].nextXp - this.xp);
      acc[1] += (v[0].nextRd - this.rd);
      acc[2] += (v[0].nextVol - this.vol);
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