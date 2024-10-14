export class Player {
  static Spla2 = 0;
  static Spla3 = 1;
  static Custom = 2;

  constructor(id, trueRating, xp, rd, vol, performanceBias) {
    this.id = id;//crypto.randomUUID();
    this.trueRating = trueRating;     // プレイヤーの実際のレーティング
    // プレイヤーのスプラレーティング。XP,RD,volは「spla2,spla3,custom」用に3種類のパラメーターを保持する
    // プレイヤーを3人複製する方が素直だが、効率重視
    this.xps = [xp, xp, xp];
    this.rds = [rd, rd, rd]; // レーティングの不確実性
    this.vols = [vol, vol, vol]; // ボラティリティ
    this.performanceBias = performanceBias; // 0 ~ bias
    this.gameResults = [[], [], []]; // リザルトも3種類確保
    this.history = []; // TODO hituyou?
  }

  // toString() {
  //   return `ID: ${this.id}
  // XP: ${toFixedNumber(this.xp, 1)}\tTRate: ${toFixedNumber(this.trueRating, 1)}\tBias: ${toFixedNumber(this.performanceBias, 3)}
  // RD: ${toFixedNumber(this.rd, 1)} vol: ${toFixedNumber(this.vol, 2)}`;
  // }

  // TODO レート計算の時は、「自身のXP、RD,vol」で増減を判断する。(実際の分布で試すまで未定)
  // 普通に考えるとチームの平均XPで増減を決める方が公平だが、スプラ3でXP5000から[2-3]のスコアで-600などを再現しようとすると、
  // RDを180くらいに高める必要があり、そのためには個人のXPで計算しないと辻褄が合わない。　
  battle(gameVer, myTeam, opponentTeam, isFT3, isGuarantee) {

    // myTeam.myXp = this.xp; 仮に自分のXPを保存する必要が出た場合、単純にmyTeamにプロパティを追加すると競合する点に注意

    // 1セットの結果を元にXPを更新する(1セットの間の勝敗でXP,RD,volは変動させない)
    this.gameResults[gameVer].push([myTeam, opponentTeam]);

    if (isFinishSet(this.gameResults[gameVer])) {
      this.finishSet(gameVer, isGuarantee);
    }

    function isFinishSet(gameResults) {
      if (!isFT3) return true;
      const scoreDiff = Math.abs(sum(gameResults.map(_ => !!_[0].isWin ? 1 : -1)));
      return (gameResults.length + scoreDiff) >= 6; // 3試合先取の場合、(試合数+勝敗の差)が6以上でセット終了と判断できる
    }
  }

  finishSet(gameVer, isGuarantee) {
    const gameResult4Stats = this.gameResults[gameVer].map((team, idx) => {
      teamPool[idx][0].setRating(this.xps[gameVer]);
      teamPool[idx][0].setRd(this.rds[gameVer]);
      teamPool[idx][0].setVol(this.vols[gameVer]);
      teamPool[idx][1].setRating(team[1].xp);
      teamPool[idx][1].setRd(team[1].rd);
      teamPool[idx][1].setVol(team[1].vol);
      return [teamPool[idx][0], teamPool[idx][1], team[0].isWin];
    });
    ranking.updateRatings(gameResult4Stats);

    gameResult4Stats.forEach((_, idx) => {
      this.gameResults[gameVer][idx][0].nextXp = _[0].getRating();
      this.gameResults[gameVer][idx][0].nextRd = _[0].getRd();
      this.gameResults[gameVer][idx][0].nextVol = _[0].getVol();
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
          estimateChangeXp: (team[0].nextXp - this.xps[gameVer]),
          rd: this.rds[gameVer],
          vol: this.vols[gameVer],
        }))
      );
    }

    // セット終了後、全ての増減を一度に更新する
    const [diffSumXp, diffSumRd, diffSumVol, scoreDiff] = this.gameResults[gameVer].reduce((acc, v) => {
      acc[0] += (v[0].nextXp - this.xps[gameVer]);
      acc[1] += (v[0].nextRd - this.rds[gameVer]);
      acc[2] += (v[0].nextVol - this.vols[gameVer]);
      acc[3] += (v[0].isWin ? 1 : -1); // 勝ち越しでプラス、負け越しでマイナス
      return acc;
    }, [0, 0, 0, 0]);

    this.xps[gameVer] = Math.max(500, this.xp + getAddXp(this.xps[gameVer], scoreDiff, diffSumXp, isGuarantee)); // XPの最低値は500(スプラ3の仕様)
    this.rds[gameVer] = toInRange(50, this.rd + diffSumRd, 350); // RDは50～350の範囲とする。明確な根拠は無いが、基本的にこの範囲を超えることはない。
    this.vol[gameVer] += diffSumVol;
    if (logHistory && this.id === targetPlayer.id) {
      const lastItem = this.history.last().last();
      lastItem.endXp = this.xps[gameVer];
      lastItem.endRd = this.rds[gameVer];
      lastItem.endVol = this.vols[gameVer];
    }

    this.gameResults[gameVer] = [];
  }


}

function getAddXp(currentXp, scoreDiff, diffSum, isGuarantee) {
  const addXpByRate = (currentXp < 2500) ? scoreDiff * 25 :
    (currentXp < 3000) ? scoreDiff * 15 :
      scoreDiff * 5 + ((scoreDiff > 0 ? 1 : -1) * 5);

  return !isGuarantee ? diffSum : // 最低保障が無いなら単純に試合ごとの増減を加算する
    scoreDiff < 0 ? Math.min(diffSum, addXpByRate) : // 最低保証がある場合は、「最低保証or単純XP増減」のうち、より変化の大きい方を採用する
      Math.max(diffSum, addXpByRate);
}
