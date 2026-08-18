import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombination, fillCombination, getSimulationSummary, isFirstPrize, isValidCombination, simulateWeek } from '../simulation-core.js';

test('조합은 1~45의 서로 다른 6개 번호로 생성된다', () => {
  let state = 123456;
  const combination = createCombination(() => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  });
  assert.equal(combination.length, 6);
  assert.equal(new Set(combination).size, 6);
  assert.ok(combination.every((number) => number >= 1 && number <= 45));
});

test('번호 조합 검증은 범위, 중복, 개수를 확인한다', () => {
  assert.equal(isValidCombination([1, 2, 3, 4, 5, 45]), true);
  assert.equal(isValidCombination([1, 2, 3, 4, 5]), false);
  assert.equal(isValidCombination([1, 2, 3, 4, 5, 46]), false);
  assert.equal(isValidCombination([1, 2, 3, 4, 5, 5]), false);
});

test('부분 선택 번호는 중복 없이 여섯 번호까지 자동 완성한다', () => {
  const values = [.2, .2, .4, .6, .8];
  let index = 0;
  const combination = fillCombination([1, 2], () => values[index++]);
  assert.deepEqual(combination, [1, 2, 10, 19, 28, 37]);
});

test('1등은 정렬된 여섯 번호가 모두 일치할 때만 판정한다', () => {
  assert.equal(isFirstPrize([1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]), true);
  assert.equal(isFirstPrize([1, 2, 3, 4, 5, 7], [1, 2, 3, 4, 5, 6]), false);
});

test('고정 난수로 선택 번호의 당첨 주를 재현한다', () => {
  const values = [0, .03, .06, .09, .12, .15];
  let index = 0;
  const random = () => values[index++ % values.length];
  const result = simulateWeek([1, 2, 3, 5, 6, 7], random);
  assert.equal(result.winningTicketType, 'selected');
  assert.deepEqual(result.draw, [1, 2, 3, 5, 6, 7]);
});

test('자동 번호도 1등 당첨으로 판정한다', () => {
  const values = [0, .03, .06, .09, .12, .15];
  let index = 0;
  const random = () => values[index++ % values.length];
  const result = simulateWeek([8, 9, 10, 11, 12, 13], random);
  assert.equal(result.winningTicketType, 'automatic');
  assert.equal(result.winningTicketIndex, 2);
  assert.deepEqual(result.winningTicket, [1, 2, 3, 5, 6, 7]);
});

test('주차별 날짜와 비용을 계산한다', () => {
  const summary = getSimulationSummary(3, '2026-08-18');
  assert.equal(summary.winningDate.toISOString().slice(0, 10), '2026-09-01');
  assert.equal(summary.totalTickets, 300);
  assert.equal(summary.totalCost, 300000);
});
