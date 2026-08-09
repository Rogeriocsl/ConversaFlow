const test = require('node:test');
const assert = require('node:assert/strict');
const { ConversationFlowService, DEFAULT_MENU_OPTIONS } = require('../src/services/conversationFlowService');

function createService(overrides = {}) {
  const automation = {
    enabled: true,
    welcomeMessage: 'Olá! Como podemos ajudar?',
    footerMessage: 'Escolha uma opção.',
    invalidOptionMessage: 'Opção inválida.',
    handoffMessage: 'Aguarde um atendente.',
    sessionTimeoutMinutes: 30,
    options: DEFAULT_MENU_OPTIONS.map(option => ({ ...option })),
    ...overrides,
  };
  return new ConversationFlowService({ settingsService: { get: () => ({ automation }) } });
}

test('apresenta o menu na primeira mensagem do contato', () => {
  const result = createService().handle('5511@c.us', 'olá');
  assert.equal(result.type, 'message');
  assert.match(result.text, /1 - Conhecer nossos produtos/);
  assert.match(result.text, /9 - Falar com um atendente/);
});

test('responde à opção selecionada e permite voltar ao menu', () => {
  const service = createService();
  service.handle('5511@c.us', 'olá');
  assert.match(service.handle('5511@c.us', '1').text, /catálogo/);
  assert.match(service.handle('5511@c.us', '0').text, /Escolha uma opção/);
});

test('pausa a automação durante atendimento humano', () => {
  const service = createService();
  service.handle('5511@c.us', 'olá');
  assert.equal(service.handle('5511@c.us', '9').event, 'handoff');
  assert.equal(service.handle('5511@c.us', 'preciso de ajuda').type, 'handoff-active');
  assert.equal(service.handle('5511@c.us', 'menu').event, 'menu:root');
});

test('informa quando a opção não existe', () => {
  const service = createService();
  service.handle('5511@c.us', 'olá');
  assert.match(service.handle('5511@c.us', '99').text, /Opção inválida/);
});

test('navega por submenus e volta ao menu anterior', () => {
  const service = createService({ flow: {
    root: 'main',
    nodes: {
      main: { type: 'menu', message: 'Menu principal', options: [{ key: '1', label: 'Produtos', target: 'products' }] },
      products: { type: 'menu', message: 'Escolha um produto', options: [{ key: '1', label: 'Catálogo', response: 'Aqui está o catálogo.' }] },
    },
  } });

  assert.match(service.handle('5511@c.us', 'olá').text, /Menu principal/);
  assert.match(service.handle('5511@c.us', '1').text, /Escolha um produto/);
  assert.match(service.handle('5511@c.us', '1').text, /Aqui está o catálogo/);
  assert.match(service.handle('5511@c.us', 'voltar').text, /Menu principal/);
});

test('comando menu retorna à raiz a partir de qualquer nível', () => {
  const service = createService({ flow: {
    root: 'main',
    nodes: {
      main: { type: 'menu', message: 'Raiz', options: [{ key: '1', label: 'Submenu', target: 'sub' }] },
      sub: { type: 'menu', message: 'Segundo nível', options: [] },
    },
  } });
  service.handle('5511@c.us', 'olá');
  assert.match(service.handle('5511@c.us', '1').text, /Segundo nível/);
  assert.match(service.handle('5511@c.us', 'menu').text, /Raiz/);
});
