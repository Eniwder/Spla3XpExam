import { Glicko2 } from 'glicko2';
import { Xmatch } from '../models/Xmatch';


addEventListener("message", ev => {
  const data = ev.data;
  if (data.command === 'init') {
    // Xmatch.init(ev.data);
    console.log(ev.data);
    console.log(Xmatch.ranking4Tmp);
    postMessage('done init');
  }
}, false);
