export const TICKETS_PER_WEEK = 100;
export const TICKET_PRICE = 1000;

export function createCombination(random = Math.random) {
  const numbers = [];
  while (numbers.length < 6) {
    const number = Math.floor(random() * 45) + 1;
    if (!numbers.includes(number)) numbers.push(number);
  }
  return numbers.sort((a, b) => a - b);
}

export function isValidCombination(numbers) {
  return Array.isArray(numbers)
    && numbers.length === 6
    && numbers.every((number) => Number.isInteger(number) && number >= 1 && number <= 45)
    && new Set(numbers).size === 6;
}

export function fillCombination(numbers, random = Math.random) {
  if (!Array.isArray(numbers) || numbers.length > 6 || !numbers.every((number) => Number.isInteger(number) && number >= 1 && number <= 45) || new Set(numbers).size !== numbers.length) {
    throw new Error('선택 번호는 1~45 사이의 서로 다른 번호여야 합니다.');
  }
  const completed = [...numbers];
  while (completed.length < 6) {
    const number = Math.floor(random() * 45) + 1;
    if (!completed.includes(number)) completed.push(number);
  }
  return completed.sort((a, b) => a - b);
}

export function isFirstPrize(ticket, draw) {
  return ticket.length === 6 && draw.length === 6
    && ticket.every((number, index) => number === draw[index]);
}

export function simulateWeek(selectedNumbers, random = Math.random) {
  if (!isValidCombination(selectedNumbers)) throw new Error('선택 번호는 1~45 사이의 서로 다른 6개여야 합니다.');

  const selectedTicket = [...selectedNumbers].sort((a, b) => a - b);
  const draw = createCombination(random);
  if (isFirstPrize(selectedTicket, draw)) {
    return { draw, winningTicket: selectedTicket, winningTicketType: 'selected', winningTicketIndex: 1 };
  }

  for (let index = 0; index < TICKETS_PER_WEEK - 1; index += 1) {
    const automaticTicket = createCombination(random);
    if (isFirstPrize(automaticTicket, draw)) {
      return { draw, winningTicket: automaticTicket, winningTicketType: 'automatic', winningTicketIndex: index + 2 };
    }
  }
  return { draw, winningTicket: null, winningTicketType: null, winningTicketIndex: null };
}

export function getSimulationSummary(weeks, startDate) {
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + (weeks - 1) * 7);
  const totalTickets = weeks * TICKETS_PER_WEEK;
  return {
    totalTickets,
    totalCost: totalTickets * TICKET_PRICE,
    winningDate: date,
    elapsedDays: (weeks - 1) * 7,
  };
}

export function formatElapsedTime(weeks) {
  const days = (weeks - 1) * 7;
  const years = Math.floor(days / 365.2425);
  const months = Math.floor((days - years * 365.2425) / 30.4375);
  return years > 0 ? `${years.toLocaleString('ko-KR')}년 ${months}개월` : `${Math.floor(days / 7).toLocaleString('ko-KR')}주`;
}
