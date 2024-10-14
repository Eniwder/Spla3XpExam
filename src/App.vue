<template>
  <v-app>
    <v-main>
      <v-container>
        <v-row justify="center">
          <!-- <v-col cols="4" sm="3">
          <v-select label="アルゴリズム" :items="algorithms" v-model="h_Algorithm" @update:model-value="generate"></v-select>
        </v-col> -->
          <v-col cols="3" sm="3">
            <v-number-input :label="$t('playersStats.powerAvg')" :min="1000" :max="4000" v-model="playersStats.powerAvg"
              variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>
          <v-col cols="3" sm="3">
            <v-number-input :label="$t('playersStats.playerNum')" :min="1000" :max="500000" :step="1000"
              v-model="playersStats.playerNum" variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>
          <v-col cols="2" sm="2">
            <v-number-input :label="$t('playersStats.sd')" :min="10" :max="1000" v-model="playersStats.sd"
              variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>
          <v-col cols="3" sm="3">
            <v-number-input :label="$t('playersStats.targetPlayerRate')" :min="100" :max="10000" :step="50"
              v-model="playersStats.targetPlayerRate" variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>
          <!-- <v-col cols="4" sm="3">
            <v-number-input :label="$t('ratingParam.rd')" :min="50" :max="350" v-model="ratingParam.rd"
              variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>
          <v-col cols="4" sm="3">
            <v-number-input :label="$t('ratingParam.vol')" :min="0" :max="1" :step="0.01" v-model="ratingParam.vol"
              variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>
          <v-col cols="4" sm="3">
            <v-number-input :label="$t('ratingParam.tau')" :min="0.29" :max="1.21" :step="0.1"
              v-model="ratingParam.tau" variant="outlined" control-variant="stacked"></v-number-input>
          </v-col> -->
          <v-col cols="3" sm="3">
            <v-switch :label="$t('ratingParam.isFT3')" v-model="ratingParam.isFT3" inset></v-switch>
          </v-col>
          <v-col cols="3" sm="3">
            <v-switch :label="$t('ratingParam.isGuarantee')" v-model="ratingParam.isGuarantee" inset></v-switch>
          </v-col>

          <v-col cols="4" sm="3">
            <v-number-input :label="$t('matchConfig.matchNum')" :min="0" v-model="matchConfig.matchNum"
              variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>
          <v-col cols="4" sm="3">
            <v-number-input :label="$t('matchConfig.splitRankN')" :min="0" v-model="matchConfig.splitRankN"
              variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>
          <v-col cols="4" sm="3">
            <v-number-input :label="$t('matchConfig.splitXpN')" :min="0" v-model="matchConfig.splitXpN"
              variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>

          <v-col cols="4" sm="4">
            <v-switch :label="$t('matchConfig.fairSplitTeam')" v-model="matchConfig.fairSplitTeam" inset></v-switch>
          </v-col>
          <v-col cols="4" sm="3">
            <v-number-input :label="$t('matchConfig.countStop')" :min="0" v-model="matchConfig.countStop" :step="100"
              variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>

          <v-col cols="4" sm="3">
            <v-number-input :label="$t('matchConfig.connectionErrorRate')" :min="0" :max="10" :step="0.1"
              v-model="matchConfig.connectionErrorRate" variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>

          <v-col cols="4" sm="4">
            <v-select :label="$t('matchConfig.matchAlgo')" :items="MatchAlgos" v-model="matchConfig.matchAlgo"
              item-title="label" item-value="v"></v-select>
          </v-col>
          <v-col cols="4" sm="3">
            <v-number-input :label="$t('matchConfig.mathLimitRate')" :min="10" :max="3000" :step="10"
              v-model="matchConfig.mathLimitRate" variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>

          <v-col cols="4" sm="3">
            <v-number-input :label="$t('battleBalance.performanceBias')" :min="0" :max="100"
              v-model="battleBalance.performanceBias" variant="outlined" control-variant="stacked"></v-number-input>
          </v-col>
          <v-col cols="4" sm="3">
            <v-number-input :label="$t('battleBalance.positiveImpactFactor')" :min="0" :max="1" :step="0.1"
              v-model="battleBalance.positiveImpactFactor" variant="outlined"
              control-variant="stacked"></v-number-input>
          </v-col>
          <v-col cols="4" sm="3">
            <v-number-input :label="$t('battleBalance.negativeImpactFactor')" :min="0" :max="1" :step="0.1"
              v-model="battleBalance.negativeImpactFactor" variant="outlined"
              control-variant="stacked"></v-number-input>
          </v-col>

        </v-row>

        <v-row>
          <v-col cols="4" sm="4">
            <v-btn @click="createPlayersWithChart">Create Player</v-btn>
          </v-col>
          <v-col cols="4" sm="4">
            <v-btn @click="startBattleSimulate">Season Start</v-btn>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="1" sm="1" class=""></v-col>
          <v-col cols="10" sm="10" class="echart-wrapper">
            <v-chart class="chart" :option="barOption" autoresize ref="chart" />
          </v-col>
          <v-col cols="1" sm="1" class=""></v-col>
        </v-row>

        <v-row>
          <v-col cols="4" sm="4">
            <v-card title="プレイヤー統計" v-show="playersStats.init">
              <v-card-text>
                <ul>
                  <li>{{ t("playersStats.summary.num") }} : {{ playersStats.summary.num }}</li>
                  <li>{{ t("playersStats.summary.max") }} : {{ playersStats.summary.max }}</li>
                  <li>{{ t("playersStats.summary.avg") }} : {{ playersStats.summary.avg }}</li>
                  <li>{{ t("playersStats.summary.min") }} : {{ playersStats.summary.min }}</li>
                  <li>{{ t("playersStats.summary.playerPower") }} : {{ playersStats.summary.playerPower }}</li>
                </ul>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>


      </v-container>
    </v-main>
    <!-- <AppFooter /> -->
  </v-app>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch, provide, shallowRef } from 'vue';
import { use, registerTransform } from 'echarts/core';
// import * as echarts from 'echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, PieChart } from 'echarts/charts';
import { transform } from 'echarts-stat';
import { useTheme } from 'vuetify';
import VChart, { THEME_KEY } from 'vue-echarts';

import boxmuller from 'box-muller';
import { Glicko2 } from 'glicko2';
import crypto from "crypto";
const theme = useTheme();
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  TransformComponent,
  ToolboxComponent,
} from 'echarts/components';
import { useI18n } from "vue-i18n";
const { t, locale } = useI18n({ useScope: "global" });
use([
  CanvasRenderer,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  ToolboxComponent,
  TransformComponent,
]);
registerTransform(transform.histogram);
provide(THEME_KEY, theme.global.current.value.dark ? 'dark' : 'light');
import { Player } from './models/Player.js';

const LimitRateMatch = "limitRateMatch";
const SequenticalMatch = "sequenticalMatch";
const MatchAlgos = [LimitRateMatch, SequenticalMatch].map(_ => ({ label: t('matchConfig.' + _), v: _ }));

const Defaults = {
  powerAvg: 2000,
  playerNum: 200000,
  sd: 240,  // 大体　1000～3000の空間になる。適正3000場合はスプラ2でも当然XP3000を超える。
  rd: 200,
  vol: 0.05,
  tau: 0.5,
  splitRankN: 2000,
  splitXpN: 2000,
  isGuarantee: true,　// 最低保証の有無
  isFT3: true,
  fairSplitTeam: false,
  countStop: 3000,
  positiveImpactFactor: 0.3,　// 平均より強いプレイヤーの影響度 TODO このへんは、スプラ2の方式でXP3100のプレイヤーがスプラ3の方式でXP5000になるよう調整する
  negativeImpactFactor: 0.2,　// 平均より弱いプレイヤーの影響度
  connecttionErrorRate: 0.5,　// 回線落ちの確率。片方が確定で勝つ仕様とする
  performanceBias: 5,　// 最大±N%の「上振れと下振れ」のしやすさ能力を表す。0に近いほど常に安定感があるとする。
  matchAlgo: MatchAlgos[0],
  mathLimitRate: 500,
  targetPlayerRate: 2400,
  matchNum: 3000,
};

const chart = shallowRef(null);

const playersStats = reactive({
  init: false,
  playerNum: Defaults.playerNum,
  powerAvg: Defaults.powerAvg,
  sd: Defaults.sd,
  targetPlayerRate: Defaults.targetPlayerRate,
  summary: {
    num: 0,
    maxPower: 0,
    minPower: 0,
    playerPower: 0
  }
});

const ratingParam = reactive({
  rd: Defaults.rd,
  vol: Defaults.vol,
  tau: Defaults.tau,
  isGuarantee: Defaults.isGuarantee,
  isFT3: Defaults.isFT3,
});

const matchConfig = reactive({
  splitRankN: Defaults.splitRankN,
  splitXpN: Defaults.splitXpN,
  matchAlgo: Defaults.matchAlgo,
  mathLimitRate: Defaults.mathLimitRate,
  fairSplitTeam: Defaults.fairSplitTeam,
  countStop: Defaults.countStop,
  connectionErrorRate: Defaults.connectionErrorRate,
  matchNum: Defaults.matchNum,
});

const battleBalance = reactive({
  positiveImpactFactor: Defaults.positiveImpactFactor,
  negativeImpactFactor: Defaults.negativeImpactFactor,
  performanceBias: Defaults.performanceBias,
});

const logHistory = true;
const players = [];
const BinStep = 25;

const barOption = {
  title: {
    text: 'プレイヤーの実力分布',
    left: 'center',
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    formatter: (v) => {
      let dataStr = 'Amount: ';
      if (typeof v[0].data === 'number') {
        dataStr += v[0].data;
      } else {
        dataStr += v[0].data.value + '<br>' + 'Your Position!';
      }

      return `Range: ${v[0].axisValue}-${parseInt(v[0].axisValue) + BinStep}<br>${dataStr}`;
    }
  },

  xAxis: {
    type: 'category',
    data: [],
    name: '内部レート',
  },
  yAxis: {
    type: 'value',
    name: '人数',
  },
  series: [
    {
      name: 'histogram',
      type: 'bar',
      barWidth: '106%',
      data: []
    },
  ],
};

onMounted(() => {
  createPlayersWithChart();
});

function createPlayersWithChart() {
  init();
  const playersData = createPlayers(playersStats, ratingParam);
  playersData.players.forEach(player => players.push(player));
  updatePlayersSummary(playersData);
  drawPlayersChars(barOption, chart.value, playersData);

  function init() {
    playersStats.init = true;
    barOption.series[0].data = [];
    barOption.xAxis.data = [];
  }

  function updatePlayersSummary(playersData) {
    playersStats.summary.num = playersData.playerNum.toLocaleString();;
    playersStats.summary.max = toFixedNumber(playersData.maxPower);
    playersStats.summary.avg = toFixedNumber(playersData.avgPower, 1);
    playersStats.summary.min = toFixedNumber(playersData.minPower);
    playersStats.summary.playerPower = playersData.playerPower;
  }

  function drawPlayersChars(opts, chart, playersData) {
    opts.xAxis.data = playersData.category;
    opts.series[0].data = playersData.powers;
    chart.setOption(opts); // baroptisonをリアクティブにすると重すぎるので手動で更新
  }
}

function createPlayers(playersStats, ratingParam) {
  const { playerNum, powerAvg, sd, targetPlayerRate } = playersStats;
  const { rd, vol } = ratingParam;
  let minPower = 10000000000, maxPower = 0, avgAcc = 0;
  let id = 0;
  const players = [];

  const _powers = [];
  for (let i = 0; i < playerNum - 1; i++) {
    const truePower = Math.max(0, powerAvg * 2 + sd * boxmuller() - powerAvg);
    addPlayer(truePower);
  }
  addPlayer(targetPlayerRate);
  const powers = [];
  const category = [];
  const BinStep = 25;
  for (let i = (minPower - (minPower % BinStep)), lim = (maxPower + BinStep); i < lim; i += BinStep) {
    category.push(i);
    let binSum = 0;
    for (let j = i, lim2 = (i + BinStep); j < lim2; j++) {
      binSum += (_powers[j] || 0);
    }
    if ((i <= targetPlayerRate) && (targetPlayerRate <= i)) {
      binSum = {
        value: binSum,
        itemStyle: {
          color: '#a90000' // TODO
        }
      };
    }
    powers.push(binSum);
  }
  return { players, playerNum, minPower, maxPower, avgPower: (avgAcc / playerNum), powers, playerPower: targetPlayerRate, category };

  function addPlayer(truePower) {
    if (minPower > truePower) minPower = truePower;
    if (maxPower < truePower) maxPower = truePower;
    avgAcc += truePower;
    const intTp = parseInt(truePower);
    _powers[intTp] = _powers[intTp] ? (_powers[intTp] + 1) : 1;
    players.push(new Player(id, truePower, powerAvg + (truePower - powerAvg) * 0.5, rd, vol, (Math.random() * battleBalance.performanceBias) / 100));
    id++;
  }
}



function startBattleSimulate() {
  const { isGuarantee, isFT3, } = ratingParam;
  const { splitRankN, splitXpN, matchAlgo, mathLimitRate, fairSplitTeam, countStop, connectionErrorRate, matchNum, } = matchConfig;
  const { positiveImpactFactor, negativeImpactFactor } = battleBalance;

  for (let i = 0; i < matchNum; i++) {
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

    const groups = matchGroups.flatMap(_ => getMatches(_));

    groups.forEach(_ => {
      const teams = [[], []];
      if (fairSplitTeam) {
        _.sort((a, b) => Math.min(a.xp) - Math.min(b.xp));
      } else {
        _.shuffle();
      }
      teams[0].push(_[0], _[3], _[4], _[7]);
      teams[1].push(_[1], _[2], _[5], _[6]);
      // glicko2は1vs1で対戦するレーティングシステムのため、各チームの平均ステータスを持つ仮想プレイヤーを作成して計算をする
      const teamsWithStats = teams.map(team => ({
        // 真の実力は±N%のブレが存在すると考えて計算する。ブレはプレイヤーによって異なる。
        trueRating: average(team.map(_ => _.trueRating * (1 + _.performanceBias * 2 * Math.random() - _.performanceBias))),
        xp: average(team.map(_ => _.xp)),
        rd: average(team.map(_ => _.rd)),
        vol: average(team.map(_ => _.vol)),
      }));

      // スプラ3のXPではなく内部レート(真の実力と仮定)を元に勝率を計算する
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
          player.battle(teamsWithStats[winTeamIdx - 0], teamsWithStats[1 - winTeamIdx]);
        });
        return;
      }

      teams.forEach((team, idx) => {
        team.forEach(player => {
          player.battle(teamsWithStats[idx - 0], teamsWithStats[1 - idx]);
        });
      });

    });
  }

  function getMatches(players) {
    const groups = [];

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
      for (let i = 0, max = parseInt(players.length / 8); i < max; i++) {
        groups.push(players.slice(i * 8, (i + 1) * 8));
      }
      return groups;
    }
  }

}




function sum(array) {
  return array.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
};
function range(n) {
  return Array.from(Array(n), (v, k) => k);
}
function toInRange(min, v, max) {
  return Math.max(Math.min(max, v), min);
}
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
</script>


<style>
.echart-wrapper {
  width: 100vw;
  height: 50vh;
}
</style>
