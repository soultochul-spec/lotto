(() => {
  const TICKETS_PER_WEEK = 100;
  const TICKET_PRICE = 1000;
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
  let selectionMode = 'manual';
  let isRunning = false;
  let cancelled = false;

  const today = new Date();
  startDate.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  function createCombination() {
    return fillCombination([]);
  }

  function fillCombination(numbers) {
    const completed = [...numbers];
    while (completed.length < 6) {
      const number = Math.floor(Math.random() * 45) + 1;
      if (!completed.includes(number)) completed.push(number);
    }
    return completed.sort((a, b) => a - b);
  }

  function isFirstPrize(ticket, draw) {
    return ticket.every((number, index) => number === draw[index]);
  }

  function simulateWeek(selectedNumbers) {
    const draw = createCombination();
    if (isFirstPrize(selectedNumbers, draw)) return { draw, winningTicket: selectedNumbers, winningTicketType: 'selected', winningTicketIndex: 1 };
    for (let index = 0; index < 99; index += 1) {
      const ticket = createCombination();
      if (isFirstPrize(ticket, draw)) return { draw, winningTicket: ticket, winningTicketType: 'automatic', winningTicketIndex: index + 2 };
    }
    return null;
  }

  function setSelected(numbers) {
    selected.clear();
    numbers.forEach((number) => selected.add(number));
    numberGrid.querySelectorAll('.ball').forEach((button) => {
      const picked = selected.has(Number(button.textContent));
      button.classList.toggle('is-selected', picked);
      button.setAttribute('aria-pressed', String(picked));
    });
    updateSelection();
  }

  function updateSelection() {
    selectedCount.textContent = selectionMode === 'partial' && selected.size < 6 ? `${selected.size}개 선택 · 나머지 자동` : `${selected.size} / 6 선택`;
    const canStart = selectionMode === 'manual' ? selected.size === 6 : selected.size >= 1;
    startButton.disabled = !canStart || isRunning;
    numberGrid.classList.toggle('is-locked', selectionMode === 'auto');
    autoSelectButton.hidden = selectionMode !== 'auto';
  }

  function chooseAutomaticNumbers() {
    setSelected(fillCombination([]));
    status.textContent = '자동 번호 6개를 뽑았습니다. 마음에 들면 시뮬레이션을 시작하세요.';
  }

  for (let number = 1; number <= 45; number += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ball ball-${Math.ceil(number / 10)}`;
    button.textContent = number;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      if (selectionMode === 'auto' || isRunning) return;
      if (selected.has(number)) selected.delete(number);
      else if (selected.size < (selectionMode === 'partial' ? 5 : 6)) selected.add(number);
      setSelected([...selected]);
    });
    numberGrid.append(button);
  }

  modeInputs.forEach((input) => input.addEventListener('change', () => {
    selectionMode = input.value;
    result.hidden = true;
    if (selectionMode === 'auto') chooseAutomaticNumbers();
    else {
      setSelected([]);
      status.textContent = selectionMode === 'partial' ? '원하는 번호를 1~5개 선택하면 나머지를 자동으로 채웁니다.' : '번호 6개를 선택해 주세요.';
    }
  }));

  autoSelectButton.addEventListener('click', chooseAutomaticNumbers);
  clearButton.addEventListener('click', () => {
    result.hidden = true;
    if (selectionMode === 'auto') chooseAutomaticNumbers();
    else {
      setSelected([]);
      status.textContent = selectionMode === 'partial' ? '원하는 번호를 1~5개 선택하면 나머지를 자동으로 채웁니다.' : '번호 6개를 선택해 주세요.';
    }
  });

  startButton.addEventListener('click', () => {
    const selectedNumbers = selectionMode === 'partial' ? fillCombination([...selected]) : [...selected].sort((a, b) => a - b);
    if (selectedNumbers.length !== 6 || !startDate.value) return;
    if (selectionMode === 'partial') setSelected(selectedNumbers);
    result.hidden = true;
    isRunning = true;
    cancelled = false;
    clearButton.disabled = true;
    cancelButton.hidden = false;
    updateSelection();
    status.textContent = '시뮬레이션을 시작합니다…';
    runSimulation(selectedNumbers);
  });

  cancelButton.addEventListener('click', () => { cancelled = true; });

  function runSimulation(selectedNumbers) {
    let week = 1;
    function processChunk() {
      if (cancelled) return finishRun('시뮬레이션을 취소했습니다.');
      for (let count = 0; count < 100; count += 1, week += 1) {
        const simulation = simulateWeek(selectedNumbers);
        if (simulation) {
          showResult(week, simulation);
          return finishRun(`${week.toLocaleString('ko-KR')}주차에 1등이 나왔습니다!`);
        }
      }
      status.textContent = `${(week - 1).toLocaleString('ko-KR')}주차까지 확인 중…`;
      setTimeout(processChunk, 0);
    }
    processChunk();
  }

  function finishRun(message) {
    isRunning = false;
    cancelled = false;
    clearButton.disabled = false;
    cancelButton.hidden = true;
    status.textContent = message;
    updateSelection();
  }

  function showResult(weeks, simulation) {
    const date = new Date(`${startDate.value}T12:00:00`);
    date.setDate(date.getDate() + (weeks - 1) * 7);
    const totalTickets = weeks * TICKETS_PER_WEEK;
    const days = (weeks - 1) * 7;
    const years = Math.floor(days / 365.2425);
    const months = Math.floor((days - years * 365.2425) / 30.4375);
    document.querySelector('#weeks').textContent = `${weeks.toLocaleString('ko-KR')}주`;
    document.querySelector('#elapsed').textContent = years > 0 ? `${years.toLocaleString('ko-KR')}년 ${months}개월` : `${Math.floor(days / 7).toLocaleString('ko-KR')}주`;
    document.querySelector('#winning-date').textContent = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(date);
    document.querySelector('#tickets').textContent = `${totalTickets.toLocaleString('ko-KR')}장`;
    document.querySelector('#cost').textContent = `${(totalTickets * TICKET_PRICE).toLocaleString('ko-KR')}원`;
    renderBalls('#draw-balls', simulation.draw);
    renderBalls('#ticket-balls', simulation.winningTicket);
    document.querySelector('#ticket-type').textContent = simulation.winningTicketType === 'selected' ? '내가 선택한 고정 번호로 당첨' : `자동 구매 ${simulation.winningTicketIndex}번째 번호로 당첨`;
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
})();
