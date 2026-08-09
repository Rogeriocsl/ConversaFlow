const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { ConversationPersistenceService } = require('../src/services/conversationPersistenceService');

test('mantém sessão, dados e histórico após recriar o serviço', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'conversaflow-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const first = new ConversationPersistenceService({ userDataPath: directory });
  await first.load();
  await first.saveSession('5511@c.us', { currentNodeId: 'products', history: ['main'], updatedAt: Date.now() });
  await first.setContactData('5511@c.us', 'name', 'Maria');
  await first.appendHistory('5511@c.us', { direction: 'in', text: 'Olá' });

  const restored = new ConversationPersistenceService({ userDataPath: directory });
  await restored.load();
  assert.equal(restored.getSession('5511@c.us').currentNodeId, 'products');
  assert.equal(restored.getContact('5511@c.us').data.name, 'Maria');
  assert.equal(restored.getContact('5511@c.us').history[0].text, 'Olá');
});

test('limita o histórico por contato', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'conversaflow-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const persistence = new ConversationPersistenceService({ userDataPath: directory, historyLimit: 2 });
  await persistence.load();
  await persistence.appendHistory('5511@c.us', { text: '1' });
  await persistence.appendHistory('5511@c.us', { text: '2' });
  await persistence.appendHistory('5511@c.us', { text: '3' });
  assert.deepEqual(persistence.getContact('5511@c.us').history.map(item => item.text), ['2', '3']);
});
