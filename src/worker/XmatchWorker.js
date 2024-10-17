import { Glicko2 } from 'glicko2';
import { Xmatch } from '../models/Xmatch';


addEventListener("message", ev => {
  const [id, data] = ev.data;
  if (data.command === 'init') {
    Xmatch.init(data.players, data.sampleIds, data.opts);
    postMessage([id, { gameVer: Xmatch.gameVer, xps: Xmatch.getSamplesXp() }]);
  } else if (data.command === 'battle') {
    Xmatch.processMatch();
    postMessage([id, { gameVer: Xmatch.gameVer, xps: Xmatch.getSamplesXp() }]);
  }
}, false);


