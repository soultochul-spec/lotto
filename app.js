import { fillCombination, getSimulationSummary, isValidCombination, formatElapsedTime, simulateWeek } from './simulation-core.js';

const numberGrid = document.querySelector('#number-grid');
const selectedCount = document.querySelector('#selected-count');
const startDate = document.querySelector('#start-date');
const startButton = document.querySelector('#start-button');
const clearButton = document.querySelector('#clear-button');
const cancelButton = document.querySelector('#cancel-button');
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const modeInputs = document.querySelectorAll('input[name="selection-mode"]');
const autoSelectButton = document.querySelector('#auto-select-button');
const selected = new Set();
let worker = null;
let isRunning = false;
let mainRunCancelled = false;
let selectionMode = 'manual';

const today = new Date();
startDate.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

for (let number = 1; number <= 45; number += 1) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `ball ball-${Math.ceil(number / 10)}`;
  button.textContent = number;
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => toggleNumber(number, button));
  numberGrid.append(button);
}

function toggleNumber(number, button) {
  if (selectionMode === 'auto' || isRunning) return;
  if (selected.has(number)) {
    selected.delete(number);
    button.classList.remove('is-selected');
    button.setAttribute('aria-pressed', 'false');
  } else if (selected.size < (selectionMode === 'partial' ? 5 : 6)) {
    selected.add(number);
    button.classList.add('is-selected');
    button.setAttribute('aria-pressed', 'true');
  }
  updateSelection();
}

function updateSelection() {
  const countText = selectionMode === 'partial' && selected.size < 6
    ? `${selected.size}개 선택 · 나머지 자동`
    : `${selected.size} / 6 선택`;
  selectedCount.textContent = countText;
  const canStart = selectionMode === 'manual' ? selected.size === 6 : selected.size >= 1;
  startButton.disabled = !canStart || isRunning;
  numberGrid.classList.toggle('is-locked', selectionMode === 'auto');
  autoSelectButton.hidden = selectionMode !== 'auto';
}

function setSelected(numbers) {
  selected.clear();
  numbers.forEach((number) => selected.add(number));
  numberGrid.querySelectorAll('.ball').forEach((button) => {
    const isSelected = selected.has(Number(button.textContent));
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
  updateSelection();
}

function chooseAutomaticNumbers() {
  setSelected(fillCombination([]));
  status.textContent = '자동 번호 6개를 뽑았습니다. 마음에 들면 시뮬레이션을 시작하세요.';
}

modeInputs.forEach((input) => input.addEventListener('change', () => {
  selectionMode = input.value;
  result.hidden = true;
  if (selectionMode === 'auto') {
    chooseAutomaticNumbers();
  } else {
    setSelected([]);
    status.textContent = selectionMode === 'partial'
      ? '원하는 번호를 1~5개 선택하면 나머지를 자동으로 채웁니다.'
      : '번호 6개를 선택해 주세요.';
  }
}));

autoSelectButton.addEventListener('click', chooseAutomaticNumbers);

clearButton.addEventListener('click', () => {
  result.hidden = true;
  if (selectionMode === 'auto') chooseAutomaticNumbers();
  else {
    setSelected([]);
    status.textContent = selectionMode === 'partial'
      ? '원하는 번호를 1~5개 선택하면 나머지를 자동으로 채웁니다.'
      : '번호 6개를 선택해 주세요.';
  }
});

startButton.addEventListener('click', () => {
  const selectedNumbers = selectionMode === 'partial' ? fillCombination([...selected]) : [...selected].sort((a, b) => a - b);
  if (!isValidCombination(selectedNumbers) || !startDate.value) return;
  if (selectionMode === 'partial') {
    setSelected(selectedNumbers);
    status.textContent = '부분 선택 번호를 자동으로 완성했습니다.';
  }
  result.hidden = true;
  isRunning = true;
  startButton.disabled = true;
  clearButton.disabled = true;
  cancelButton.hidden = false;
  if (location.protocol === 'file:') {
    status.textContent = '시뮬레이션을 시작합니다…';
    runOnMainThread(selectedNumbers);
  } else {
    worker = new Worker('./simulation-worker.js', { type: 'module' });
    status.textContent = '시뮬레이션을 시작합니다…';
    worker.onmessage = ({ data }) => handleWorkerMessage(data, selectedNumbers);
    worker.onerror = () => finishRun('계산 중 오류가 발생했습니다. 다시 시도해 주세요.');
    worker.postMessage({ type: 'start', selectedNumbers });
  }
});

cancelButton.addEventListener('click', () => {
  if (worker) worker.postMessage({ type: 'cancel' });
  else mainRunCancelled = true;
});

function runOnMainThread(selectedNumbers) {
  mainRunCancelled = false;
  let week = 1;
  const chunkSize = 100;

  function processChunk() {
    if (mainRunCancelled) {
      finishRun('시뮬레이션을 취소했습니다.');
      return;
    }
    for (let count = 0; count < chunkSize; count += 1, week += 1) {
      const simulation = simulateWeek(selectedNumbers);
      if (simulation.winningTicket) {
        showResult({ type: 'complete', week, ...simulation });
        finishRun(`${week.toLocaleString('ko-KR')}주차에 1등이 나왔습니다!`);
        return;
      }
    }
    status.textContent = `${(week - 1).toLocaleString('ko-KR')}주차까지 확인 중…`;
    setTimeout(processChunk, 0);
  }
  processChunk();
}

function handleWorkerMessage(data) {
  if (data.type === 'progress') {
    status.textContent = `${data.week.toLocaleString('ko-KR')}주차까지 확인 중…`;
    return;
  }
  if (data.type === 'cancelled') {
    finishRun('시뮬레이션을 취소했습니다.');
    return;
  }
  if (data.type === 'complete') {
    showResult(data);
    finishRun(`${data.week.toLocaleString('ko-KR')}주차에 1등이 나왔습니다!`);
  }
}

function finishRun(message) {
  worker?.terminate();
  worker = null;
  isRunning = false;
  mainRunCancelled = false;
  clearButton.disabled = false;
  cancelButton.hidden = true;
  status.textContent = message;
  updateSelection();
}

function showResult(data) {
  const summary = getSimulationSummary(data.week, startDate.value);
  document.querySelector('#weeks').textContent = `${data.week.toLocaleString('ko-KR')}주`;
  document.querySelector('#elapsed').textContent = formatElapsedTime(data.week);
  document.querySelector('#winning-date').textContent = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(summary.winningDate);
  document.querySelector('#tickets').textContent = `${summary.totalTickets.toLocaleString('ko-KR')}장`;
  document.querySelector('#cost').textContent = `${summary.totalCost.toLocaleString('ko-KR')}원`;
  renderBalls('#draw-balls', data.draw);
  renderBalls('#ticket-balls', data.winningTicket);
  document.querySelector('#ticket-type').textContent = data.winningTicketType === 'selected'
    ? '내가 선택한 고정 번호로 당첨'
    : `자동 구매 ${data.winningTicketIndex}번째 번호로 당첨`;
  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderBalls(selector, numbers) {
  const target = document.querySelector(selector);
  target.replaceChildren(...numbers.map((number) => {
    const ball = document.createElement('span');
    ball.className = `result-ball ball-${Math.ceil(number / 10)}`;
    ball.textContent = number;
    return ball;
  }));
}

updateSelection();
