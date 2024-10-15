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
            <v-number-input :label="$t('playersStats.playerPower')" :min="100" :max="10000" :step="50"
              v-model="playersStats.playerPower" variant="outlined" control-variant="stacked"></v-number-input>
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
                  <li>{{ t("playersStats.summary.sd") }} : {{ playersStats.summary.sd }}</li>
                </ul>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="4" sm="4">
            <v-card title="あなたの情報" v-show="playersStats.init">
              <v-card-text>
                <ul>
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
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import { useTheme } from 'vuetify';
import VChart, { THEME_KEY } from 'vue-echarts';
import { UniversalTransition } from 'echarts/features';
// import * as echarts from 'echarts'; // TODO

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
  ToolboxComponent
} from 'echarts/components';
import { useI18n } from "vue-i18n";
const { t, locale } = useI18n({ useScope: "global" });
use([
  CanvasRenderer,
  BarChart,
  PieChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  ToolboxComponent,
  TransformComponent,
  UniversalTransition,
]);
provide(THEME_KEY, theme.global.current.value.dark ? 'dark' : 'light');
// import { Player } from './models/Player.js';
import { Xmatch } from './models/Xmatch.js';
const XmatchWorker = new Worker(new URL('./worker/XmatchWorker.js', import.meta.url), {
  type: 'module',
});

const PlayerBarColor = '#a90000'; // TODO
const LimitRateMatch = Xmatch.LimitRateMatch;
const SequentialMatch = Xmatch.SequentialMatch;
const MatchAlgos = [LimitRateMatch, SequentialMatch].map(_ => ({ label: t('matchConfig.' + _), v: _ }));

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
  connectionErrorRate: 0.5,　// 回線落ちの確率。片方が確定で勝つ仕様とする
  performanceBias: 5,　// 最大±N%の「上振れと下振れ」のしやすさ能力を表す。0に近いほど常に安定感があるとする。
  matchAlgo: MatchAlgos[0],
  mathLimitRate: 500,
  playerPower: 2400,
  matchNum: 10,
};

const chart = shallowRef(null);

const playersStats = reactive({
  init: false,
  playerNum: Defaults.playerNum,
  powerAvg: Defaults.powerAvg,
  sd: Defaults.sd,
  playerPower: Defaults.playerPower,
  summary: {
    num: 0,
    powerMax: 0,
    powerMin: 0,
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
let players = [];
let sampleIds = [];
const BinStep = 25;
const SamplingStep = 500;

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
      let dataStr = `Amount: ${v[0].data.value}`;
      if (v[0].color === PlayerBarColor) {
        dataStr += v[0].data.value + '<br>' + 'Your Position!';
      }
      return `Range: ${v[0].axisValue}-${parseInt(v[0].axisValue) + BinStep}<br>${dataStr}`;
    }
  },

  xAxis: {
    type: 'category',
    data: [],
    name: '内部レート',
    // nameLocation: 'middle' // TODO
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
      id: 1000,
      universalTransition: {
        enabled: true,
        seriesKey: [],
        delay: function (idx, count) {
          return Math.random() * 400;
        }
      }
    },
  ],
};

const lineOption = {
  title: {
    text: 'AAAAAAAAAA'
  },
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    name: 'Battles(N)',
    type: 'category',
  },
  yAxis: {
    name: 'XP',
    type: 'value'
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    // formatter: (v) => {
    //   console.log(v);
    //   return v.map((_, idx) => `XP: ${toFixedNumber(_.data, 1)}` + (idx === (v.length - 1) ? '<- You!' : '')).join('<br>');
    // }
  },
  series: []
};

onMounted(() => {
  createPlayersWithChart();
});

function createPlayersWithChart() {
  players = generatePlayers(playersStats);
  const histData = createHistData(players, playersStats.playerPower, BinStep);
  sampleIds = histData.sampleIds;
  updatePlayersSummary(playersStats, players, histData);
  drawPlayersChart(barOption, chart.value, histData);
}

function generatePlayers(playersStats) {
  const { playerNum, powerAvg, sd, playerPower } = playersStats;
  const players = [];
  for (let i = 0; i < playerNum - 1; i++) {
    const powerTrue = Math.max(0, powerAvg * 2 + sd * boxmuller() - powerAvg);
    players.push([i, powerTrue]);
  }
  players.push([playerNum, playerPower]);
  return players;
}

function updatePlayersSummary(playersStats, players, histData) {
  playersStats.init = true;
  playersStats.summary.num = players.length.toLocaleString();;
  playersStats.summary.max = toFixedNumber(histData.powerMax[1], 1);
  playersStats.summary.avg = toFixedNumber(playersStats.powerAvg, 0);
  playersStats.summary.sd = toFixedNumber(playersStats.sd, 0);
  playersStats.summary.min = toFixedNumber(histData.powerMin[1], 1);
  playersStats.summary.playerPower = playersStats.playerPower;
}

function getSeriesKey() {
  return sampleIds.map((id, idx) => String(Number(barOption.series[0].data[0].groupId) + idx * SamplingStep));
}

function drawPlayersChart(barOption, chart, histData) {
  barOption.xAxis.data = histData.bins;
  barOption.series[0].data = histData.powersByBin;
  barOption.series[0].universalTransition.seriesKey = getSeriesKey();
  chart.setOption(barOption); // baroptisonをリアクティブにすると重すぎるので手動で更新
}

function createHistData(players, playerPower, binStep) {
  const powersByBin = [];
  const bins = [];
  const sampleIds = [];

  let powerMin = [-1, 10000000000], powerMax = [-1, 0];
  const powers = [];
  players.forEach(pl => { // pl[0]=id, pl[1]=power
    if (powerMax[1] < pl[1]) { powerMax[0] = pl[0]; powerMax[1] = pl[1]; };
    if (powerMin[1] > pl[1]) { powerMin[0] = pl[0]; powerMin[1] = pl[1]; };
    const powerIdx = parseInt([pl[1]]);
    if (!powers[powerIdx]) powers[powerIdx] = [pl[0], 0];
    powers[powerIdx][1]++;
  });

  sampleIds.push(powerMin[0]);
  for (let i = (powerMin[1] - (powerMin[1] % binStep)), lim = (powerMax[1] + binStep); i < lim; i += binStep) {
    bins.push(i);
    let binSum = 0, sampleId = -1;
    for (let j = i, lim2 = (i + binStep); j < lim2; j++) {
      if (powers[j]) {
        sampleId = powers[j][0];
        binSum += (powers[j][1] || 0);
      }
    }
    const binData = {
      value: binSum,
      groupId: String(i - (i % SamplingStep))
    };
    if ((i <= playerPower) && (playerPower <= i)) {
      binData.itemStyle = {
        color: PlayerBarColor
      };
      binData.groupId = 'player';
    }
    powersByBin.push(binData);
    if ((i % SamplingStep === 0) && sampleId >= 0) {
      sampleIds.push(sampleId);
    }
  }
  sampleIds.push(powerMax[0]);

  return { powerMin, powerMax, powersByBin, bins, sampleIds };
}



function startBattleSimulate() {
  console.log(lineOption);

  const grpIds = getSeriesKey();

  lineOption.series = sampleIds.map((id, idx) => {
    return {
      // groupId: grpId,
      dataGroupId: grpIds[idx],
      id: grpIds[idx],
      universalTransition: {
        enabled: true,
        delay: function (idx, count) {
          return Math.random() * 400;
        }
      },
      type: 'line',
      data: [players[id][1]]
    };
  });
  lineOption.series.push({
    groupId: 'player',
    dataGroupId: 'player',
    id: 'player',
    universalTransition: {
      enabled: true,
      delay: function (idx, count) {
        return Math.random() * 400;
      }
    },
    type: 'line',
    data: [players[players.length - 1][1]]
  });

  // setTimeout(() => chart.value.setOption(barOption, true), 2000);

  chart.value.setOption(lineOption, true);
  const XmatchWorker1 = new Worker(new URL('./worker/XmatchWorker.js', import.meta.url), { type: 'module' });
  const XmatchWorker2 = new Worker(new URL('./worker/XmatchWorker.js', import.meta.url), { type: 'module' });
  const XmatchWorker3 = new Worker(new URL('./worker/XmatchWorker.js', import.meta.url), { type: 'module' });
  XmatchWorker1.postMessage({ command: 'init', data: players });
  // Xmatch.init({ tau: ratingParam.tau, rating: playersStats.powerAvg, rd: ratingParam.rd, vol: ratingParam.vol }, players);

  for (let i = 0; i < matchConfig.matchNum; i++) {
    // Xmatch.processSpla2Match(players);
    // Xmatch.processSpla3Match(players);
    // Xmatch.processCutomMatch(players, matchConfig, ratingParam, battleBalance);
  }

  XmatchWorker1.terminate();
  XmatchWorker2.terminate();
  XmatchWorker3.terminate();


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
;</script>


<style>
.echart-wrapper {
  width: 100vw;
  height: 50vh;
}
</style>
