import { simulateWeek } from './simulation-core.js';

let cancelled = false;

self.onmessage = ({ data }) => {
  if (data.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (data.type === 'start') {
    cancelled = false;
    run(data.selectedNumbers, 1);
  }
};

function run(selectedNumbers, firstWeek) {
  let week = firstWeek;
  const chunkSize = 500;

  function processChunk() {
    if (cancelled) {
      self.postMessage({ type: 'cancelled' });
      return;
    }

    for (let count = 0; count < chunkSize; count += 1, week += 1) {
      const result = simulateWeek(selectedNumbers);
      if (result.winningTicket) {
        self.postMessage({ type: 'complete', week, ...result });
        return;
      }
    }
    self.postMessage({ type: 'progress', week: week - 1 });
    setTimeout(processChunk, 0);
  }

  processChunk();
}
