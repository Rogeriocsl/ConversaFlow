const test = require('node:test');
const assert = require('node:assert/strict');
const { parseHHMM, sanitizeSchedule, isNowWithinSchedule } = require('../src/utils/schedule');
const { applyTemplate } = require('../src/utils/template');
const { toChatId, sanitizeCustomList } = require('../src/utils/phone');
const { clamp, computeJitteredDelay } = require('../src/utils/delay');

test('valida e normaliza horários', () => {
  assert.equal(parseHHMM('08:30'), 510);
  assert.equal(parseHHMM('25:00'), null);
  assert.deepEqual(sanitizeSchedule({ enabled: true, start: 'x', end: '18:00' }), { enabled: true, start: '08:00', end: '18:00' });
  assert.equal(isNowWithinSchedule({ enabled: true, start: '22:00', end: '06:00' }, new Date(2026, 0, 1, 23, 0)), true);
});

test('aplica variáveis da mensagem', () => {
  assert.equal(applyTemplate('Olá {{first}} ({{nome}})', { name: 'Maria Silva' }), 'Olá Maria (Maria Silva)');
});

test('normaliza números e remove duplicados', () => {
  assert.equal(toChatId('+55 (11) 99999-8888'), '5511999998888@c.us');
  assert.deepEqual(sanitizeCustomList(['5511', { number: '5511', name: 'Ana' }]), [{ id: '5511@c.us', name: 'Ana' }]);
});

test('limita e aplica jitter ao delay', () => {
  assert.equal(clamp(10, 300, 10000, 1500), 300);
  assert.equal(computeJitteredDelay(1000, 0.2, 300, () => 1), 1200);
});
