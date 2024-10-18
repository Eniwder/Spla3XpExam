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
            <v-number-input :label="$t('matchConfig.fairSplitTeam')" :min="0" :max="1" :step="0.1"
              v-model="matchConfig.fairSplitTeam" variant="outlined" control-variant="stacked"></v-number-input>
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
            <v-btn @click="createPlayersWithChart" color="#1bbeab">Create Player</v-btn>
          </v-col>
          <v-col cols="4" sm="4">
            <v-btn @click="startBattleSimulate" color="#1bbeab">Season Start</v-btn>
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
            <v-card title="Players Stats" v-show="playersStats.init">
              <v-card-text>
                <ul style="color:var(--spla3-xmatch)">
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
            <v-card title="Your Profile" v-show="playersStats.init">
              <v-card-text>
                <ul>
                  <li>{{ t("playersStats.summary.playerPower") }} : {{ playersStats.summary.playerPower }}</li>
                </ul>
              </v-card-text>
            </v-card>
          </v-col>
          <IkaMorphButton />
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
import IkaMorphButton from './components/IkaMorphButton';
// import * as echarts from 'echarts'; // TODO

import boxmuller from 'box-muller';
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
// const XmatchWorker = new Worker(new URL('./worker/XmatchWorker.js', import.meta.url), {
//   type: 'module',
// });

const LimitRateMatch = Xmatch.LimitRateMatch;
const SequentialMatch = Xmatch.SequentialMatch;
const MatchAlgos = [LimitRateMatch, SequentialMatch].map(_ => ({ label: t('matchConfig.' + _), v: _ }));
const DefaultChartFont = {
  fontFamily: ['Paintball', 'Meiryo',], // なぜか「M PLUS 2」を指定できないのでMeiryoで妥協
  fontWeight: 900
};
const DefaultChartBack = '#212121';

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
  fairSplitTeam: 0.5,
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

const Spla2Conf = {
  ratingParam: {
    rd: Defaults.rd,
    vol: Defaults.vol,
    tau: Defaults.tau,
    isFT3: false,
    isGuarantee: false,
    powerAvg: playersStats.powerAvg,
  },
  matchingConfig: {
    connectionErrorRate: 0.5,
    splitRankN: 0,
    splitXpN: 0,
    countStop: 0,
    matchAlgo: Xmatch.LimitRateMatch,
    mathLimitRate: 500,
    fairSplitTeam: Defaults.fairSplitTeam,
  },
  battleBalance: {
    positiveImpactFactor: Defaults.positiveImpactFactor,
    negativeImpactFactor: Defaults.negativeImpactFactor,
    performanceBias: Defaults.performanceBias,
  },
  gameVer: Xmatch.Spla2,
};

const Spla3Conf = {
  ratingParam: {
    rd: Defaults.rd,
    vol: Defaults.vol,
    tau: Defaults.tau,
    isFT3: true,
    isGuarantee: true,
    powerAvg: playersStats.powerAvg,
  },
  matchingConfig: {
    connectionErrorRate: 0.5,
    splitRankN: 2000,
    splitXpN: 2000,
    countStop: 3000,
    matchAlgo: Xmatch.LimitRateMatch,
    mathLimitRate: 300,
    fairSplitTeam: Defaults.fairSplitTeam,
  },
  battleBalance: {
    positiveImpactFactor: Defaults.positiveImpactFactor,
    negativeImpactFactor: Defaults.negativeImpactFactor,
    performanceBias: Defaults.performanceBias,
  },
  gameVer: Xmatch.Spla3,
};

// 定数
const BinStep = 25;
const SamplingStep = 500;
const PlayerDefault = {
  id: -1,
  powerTrue: -1,
  bias: -1,
  currentXps: [0, 0, 0],
  minXps: [0, 0, 0],
  maxXps: [0, 0, 0],
};

// 準定数
const splaPallet = {
  spla1: {}, spla2: {}, spla3: {}
};
const player = reactive({ ...PlayerDefault });

// mutable
// const logHistory = true;
let players = [];
let sampleIds = [];
let battleCount = 0;


const barOption = {
  textStyle: DefaultChartFont,
  backgroundColor: DefaultChartBack,
  title: {
    text: 'プレイヤーの実力分布',
    left: 'center',
    top: 10,
    fontFamily: ['Paintball', 'Meiryo',], // なぜか「M PLUS 2」を指定できないのでMeiryoで妥協
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    formatter: (v) => {
      let dataStr = `Amount: ${v[0].data.value}`;
      if (v[0].color === splaPallet.spla1.blue) {
        dataStr += v[0].data.value + '<br>' + 'Your Position!';
      }
      return `Range: ${v[0].axisValue}-${parseInt(v[0].axisValue) + BinStep}<br>${dataStr}`;
    }
  },

  xAxis: {
    type: 'category',
    data: [],
    name: '内部パワー',
    nameGap: 32,
    nameLocation: 'center'
  },
  yAxis: {
    type: 'value',
    name: '人数         ',
    nameLocation: 'end',
    nameGap: 22,
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
  textStyle: DefaultChartFont,
  backgroundColor: DefaultChartBack,
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
  emphasis: {
    focus: 'series'
  },
  // animationDuration: 10000,
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    // formatter: (v) => {
    // console.log(v);
    // return v.sort((a, b) => b.data - a.data).map((_, idx) => `XP: ${toFixedNumber(_.data, 1)}` + (idx === (v.length - 1) ? '<- You!' : '')).join('<br>');
    // }
  },
  series: []
};

onMounted(() => {
  initSplaPallet();
  createPlayersWithChart();
});

function initSplaPallet() {
  const rootStyles = getComputedStyle(document.documentElement);
  splaPallet.spla1 = {
    orange: rootStyles.getPropertyValue('--spla1-theme-orange').trim(),
    blue: rootStyles.getPropertyValue('--spla1-theme-blue').trim()
  };
  splaPallet.spla2 = {
    pink: rootStyles.getPropertyValue('--spla2-theme-pink').trim(),
    green: rootStyles.getPropertyValue('--spla2-theme-green').trim()
  };
  splaPallet.spla3 = {
    yellow: rootStyles.getPropertyValue('--spla3-theme-yellow').trim(),
    blue: rootStyles.getPropertyValue('--spla3-theme-blue').trim()
  };
}

function createPlayersWithChart() {
  Object.assign(player, { ...PlayerDefault });
  players = generatePlayers(playersStats, battleBalance);
  const histData = createHistData(players, playersStats.playerPower, BinStep);
  sampleIds = histData.sampleIds;
  updatePlayersSummary(playersStats, players, histData);
  drawPlayersChart(barOption, chart.value, histData);
}

function generatePlayers(playersStats, battleBalance) {
  const { playerNum, powerAvg, sd, playerPower } = playersStats;
  Spla2Conf.ratingParam.powerAvg = powerAvg;
  Spla3Conf.ratingParam.powerAvg = powerAvg;

  const players = [];
  for (let i = 0; i < playerNum - 1; i++) {
    const powerTrue = Math.max(0, powerAvg * 2 + sd * boxmuller() - powerAvg);
    const bias = (Math.random() * battleBalance.performanceBias) / 100;
    players.push([i, powerTrue, bias]);
  }
  player.id = playerNum - 1;
  player.powerTrue = playerPower;
  const bias = (Math.random() * battleBalance.performanceBias) / 100;

  players.push([player.id, player.powerTrue, bias]);
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
  return [...sampleIds.flatMap((id, idx) => {
    const key = String(parseInt(barOption.series[0].data[0].groupId) + idx * SamplingStep);
    return [key];
  }), 'player'];
}

function drawPlayersChart(barOption, chart, histData) {
  barOption.xAxis.data = histData.bins;
  barOption.series[0].data = histData.powersByBin;
  barOption.series[0].id = 'player';//////////////////////////////////////////////////////////////////////
  barOption.series[0].universalTransition.seriesKey = getSeriesKey();
  chart.setOption(barOption); // baroptisonをリアクティブにすると重すぎるので手動で更新
}


// sampleIdsの処理を見直す、seriesKeyも見直す
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
      groupId: String(i - (i % SamplingStep)),
      itemStyle: {
        color: splaPallet.spla1.orange
      }
    };
    if ((i <= playerPower) && (playerPower <= i)) {
      binData.itemStyle.color = splaPallet.spla1.blue;
      binData.groupId = 'player';
    }
    powersByBin.push(binData);
    if ((i % SamplingStep === 0) && sampleId >= 0) {
      sampleIds.push(sampleId);
    }
  }
  sampleIds.push(powerMax[0]);
  if (!sampleIds.includes(player.id)) sampleIds.push(player.id);

  return { powerMin, powerMax, powersByBin, bins, sampleIds };
}

async function startBattleSimulate() {
  battleCount = 0;
  lineOption.xAxis.data = range(matchConfig.matchNum);
  lineOption.series = [];
  const lineData = (id, data, color) => (
    {
      dataGroupId: id,
      groupId: id.split('_')[0],
      id,
      universalTransition: {
        enabled: true,
        delay: function (idx, count) {
          return Math.random() * 400;
        },
      },
      type: 'line',
      data: [data],
      color
    }
  );

  // setTimeout(() => Line2Hist(), 1500);

  const XmatchWorker1 = createWorker(new Worker(new URL('./worker/XmatchWorker.js', import.meta.url), { type: 'module' }));
  const XmatchWorker2 = createWorker(new Worker(new URL('./worker/XmatchWorker.js', import.meta.url), { type: 'module' }));
  // const XmatchWorker3 = createWorker(new Worker(new URL('./worker/XmatchWorker.js', import.meta.url), { type: 'module' }));
  const workers = [];
  const opts = {
    [Xmatch.Spla2]: Spla2Conf,
    [Xmatch.Spla3]: Spla3Conf,
    [Xmatch.Custom]: {
      matchConfig,
      ratingParam: Object.assign({ powerAvg: playersStats.powerAvg }, ratingParam),
      battleBalance,
      gameVer: Xmatch.Custom
    }
  };
  const LineColors = [
    {
      [Xmatch.Spla2]: splaPallet.spla2.green,
      [Xmatch.Spla3]: splaPallet.spla3.blue
    },
    {
      [Xmatch.Spla2]: splaPallet.spla2.pink,
      [Xmatch.Spla3]: splaPallet.spla3.yellow
    },
  ];

  workers.push([XmatchWorker1, Xmatch.Spla2]);
  workers.push([XmatchWorker2, Xmatch.Spla3]);
  // workers.push([XmatchWorker3, Xmatch.Custom]);  // TODO


  const grpIds = getSeriesKey();
  const getChartId = (id, idx, initData) => ((id === player.id) ? 'player' : grpIds[idx]) + ((initData.gameVer === Xmatch.Spla3) ? '' : `_${initData.gameVer}`);
  // workerInit = [{ xps, gameVer }, ...]
  const workerInit = await Promise.all(workers.map(_ => _[0]({ command: 'init', players, sampleIds, opts: opts[_[1]] })));
  console.log(grpIds);
  lineOption.series = toSeriesOrder(workerInit).map(initData => {
    if (initData.id === player.id) {
      updatePlayerXp(initData.gameVer, toFixedNumber(initData.xp, 1), true);
      return lineData(getChartId(initData), player.currentXps[initData.gameVer], LineColors[0][initData.gameVer]);
    } else {
      return lineData(getChartId(initData), toFixedNumber(initData.xps[id], 1), LineColors[1][initData.gameVer]);
    }
  });

  chart.value.setOption(lineOption, true);

  // Xmatch.init({ tau: ratingParam.tau, rating: playersStats.powerAvg, rd: ratingParam.rd, vol: ratingParam.vol }, players);
  for (let i = 0; i < matchConfig.matchNum; i++) {
    // awaitだと各verのデータをバトル毎に待つのが効率悪いのでthen
    Promise.all(workers.map(_ => _[0]({ command: 'battle' }))).then(xpsByVer => {
      xpsByVer.forEach((data, idx) => {
        sampleIds.forEach(id => {
          if (id === player.id) {
            updatePlayerXp(data.gameVer, toFixedNumber(data.xps[id], 1), true);
            lineOption.series[idx].data.push(player.currentXps[data.gameVer]);
          } else {
            lineOption.series[idx].data.push(toFixedNumber(data.xps[id], 1));
          }
        });
      });
      updateBattleStep(i);
      chart.value.setOption(lineOption);
    }).catch(err => {
      console.error(err);
      workers.forEach(_ => _.terminate());
      alert('something to wrong'); // TODO
    });
  }

  // XmatchWorker1.terminate();
  // XmatchWorker2.terminate();
  // XmatchWorker3.terminate();

  function toSeriesOrder(xpsByVer) {
    const flatData = xpsByVer.flatMap(gameVer => Object.entries(ver.xps).map((id, xp) => ({ gameVer, id, xp })));
    return flatData.sort(seriesOrderSort);
    // Spla3のデータが最後尾になるように並び替える
    function seriesOrderSort(a, b) {
      if (a.gameVer === Xmatch.Spla3 && b.gameVer === Xmatch.Spla3) return a.id - b.id;
      if (a.gameVer === Xmatch.Spla3) return 1;
      if (b.gameVer === Xmatch.Spla3) return -1;
      const gameVerDiff = a.gameVer - b.gameVer;
      return (gameVerDiff !== 0) ? gameVerDiff : a.id - b.id;
    }
  }
}

function updateBattleStep(step) {
  console.log(`done: ${step}`);
  battleCount = step;
  if (battleCount >= matchConfig.matchNum) {
    workers.forEach(_ => _.terminate());
  }
  // 時間計測とか
}

function updatePlayerXp(gameVer, newXp, init) {
  player.currentXps[gameVer] = newXp;
  if (init || (newXp > player.maxXps[gameVer])) player.maxXps[gameVer] = newXp;
  if (init || (newXp < player.minXps[gameVer])) player.minXps[gameVer] = newXp;
}

// TODO 逆変換も作る。　相互変換のためにデータを上書きしないようにする。
function Line2Hist() {
  // 1. ラインにドット(symbol)をつける。つけないとアニメーションが動かないっぽい
  lineOption.series.forEach(_ => {
    _.showSymbol = true;
  });
  lineOption.animationDuration = 100;
  chart.value.setOption(lineOption);

  // 2. 各データを平均にまとめる。アニメーションの都合上、多対多の実装方法が分からなかったので1対多に置き換える
  setTimeout(() => {
    lineOption.xAxis.data = [0];
    const grpVals = lineOption.series.reduce((acc, v) => {
      if (!acc[v.groupId]) acc[v.groupId] = [];
      acc[v.groupId].push(average(v.data));
      return acc;
    }, {});

    lineOption.series = lineOption.series.filter(_ => !_.id.includes('_2')).map(_ => {
      _.showSymbol = true;
      _.data = [average(grpVals[_.groupId])];
      _.groupId === 'player' ? _.color = splaPallet.spla1.blue : _.color = splaPallet.spla1.orange;
      return _;
    });
    chart.value.setOption(lineOption, true);
  }, 400);

  // 3. 2のアニメーションが終了したタイミングでヒストグラムに戻す
  setTimeout(() => chart.value.setOption(barOption, true), 1500);
}



function createWorker(worker) {
  const map = new Map();
  let id = 0;

  worker.onmessage = event => {
    const [id, result] = event.data;
    const resolve = map.get(id);
    map.delete(id);
    resolve(result);
  };

  return data => new Promise(resolve => {
    map.set(id, resolve);
    worker.postMessage([id++, data]);
  });
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
:root {
  --spla1-theme-orange: #de6624;
  --spla1-theme-blue: #343bc4;
  --spla2-theme-pink: #c12d74;
  --spla2-theme-green: #2cb721;
  --spla3-theme-yellow: #d0be08;
  --spla3-theme-blue: #3a0ccd;
  --spla3-theme-huuka: #3834b5;
  --spla3-theme-utuho: #cfc235;
  --spla3-theme-manta: #bd3e33;

  --spla3-xmatch: #0fdd9e;
}

body {
  font-family: "Paintball", "FOT-Rowdy EB", "FOT-Rowdy Std EB",
    "FOT-Rowdy CID EB", "Rowdy EB", "Rowdy Std EB", "Rowdy CID EB", "M PLUS 2" !important;
}


.echart-wrapper {
  width: 100vw;
  height: 50vh;
}
</style>
