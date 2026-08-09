const DEFAULT_MENU_OPTIONS = Object.freeze([
  { key: '1', label: 'Conhecer nossos produtos', response: 'Confira nosso catálogo e conheça todos os produtos disponíveis.' },
  { key: '2', label: 'Consultar preços', response: 'Informe qual produto você deseja consultar e nossa equipe enviará os preços.' },
  { key: '3', label: 'Fazer um pedido', response: 'Para iniciar seu pedido, envie os produtos e as quantidades desejadas.' },
  { key: '4', label: 'Horário de atendimento', response: 'Nosso horário de atendimento está disponível nesta conversa.' },
  { key: '5', label: 'Endereço', response: 'Envie sua cidade ou bairro para receber o endereço da unidade mais próxima.' },
  { key: '9', label: 'Falar com um atendente', action: 'handoff', response: 'Certo! Encaminhamos sua conversa para um atendente. Aguarde um momento.' },
]);

function sanitizeOptions(options) {
  return (Array.isArray(options) ? options : []).filter(Boolean).map(option => ({
    key: String(option.key || '').trim(),
    label: String(option.label || '').trim(),
    response: String(option.response || '').trim(),
    ...(option.target ? { target: String(option.target).trim() } : {}),
    ...(option.action === 'handoff' ? { action: 'handoff' } : {}),
  })).filter(option => option.key && option.label);
}

function sanitizeFlowDefinition(flow) {
  if (!flow || typeof flow !== 'object' || !flow.nodes || typeof flow.nodes !== 'object') return null;
  const nodes = {};
  for (const [id, value] of Object.entries(flow.nodes)) {
    if (!value || typeof value !== 'object') continue;
    const nodeId = String(id).trim();
    if (!nodeId) continue;
    nodes[nodeId] = {
      id: nodeId,
      type: value.type === 'message' ? 'message' : 'menu',
      message: String(value.message || '').trim(),
      options: sanitizeOptions(value.options),
    };
  }
  const root = String(flow.root || '').trim();
  if (!root || !nodes[root]) return null;
  return { root, nodes };
}

class ConversationFlowService {
  constructor({ settingsService, log = () => {} }) {
    this.settings = settingsService;
    this.log = log;
    this.sessions = new Map();
  }

  config() { return this.settings.get().automation; }
  normalize(value) { return String(value || '').trim().toLocaleLowerCase('pt-BR'); }
  reset(contactId) { this.sessions.delete(contactId); }

  getFlow() {
    const config = this.config();
    const configured = sanitizeFlowDefinition(config.flow);
    if (configured) return configured;
    return {
      root: 'main',
      nodes: { main: { id: 'main', type: 'menu', message: config.welcomeMessage, options: sanitizeOptions(config.options) } },
    };
  }

  getSession(contactId, flow) {
    const timeoutMs = this.config().sessionTimeoutMinutes * 60000;
    const session = this.sessions.get(contactId);
    if (!session || Date.now() - session.updatedAt > timeoutMs || !flow.nodes[session.currentNodeId]) {
      const fresh = { currentNodeId: flow.root, history: [], handedOff: false, updatedAt: Date.now() };
      this.sessions.set(contactId, fresh);
      return { session: fresh, isNew: true };
    }
    session.updatedAt = Date.now();
    return { session, isNew: false };
  }

  renderNode(node) {
    const config = this.config();
    if (node.type === 'message') return `${node.message}\n\nDigite *0* para voltar.`.trim();
    const options = node.options.map(option => `${option.key} - ${option.label}`).join('\n');
    return `${node.message}\n\n${options}\n\n${config.footerMessage}`.trim();
  }

  goToRoot(session, flow) {
    session.currentNodeId = flow.root;
    session.history = [];
    session.handedOff = false;
    return { type: 'message', text: this.renderNode(flow.nodes[flow.root]), event: 'menu:root' };
  }

  goBack(session, flow) {
    session.handedOff = false;
    session.currentNodeId = session.history.pop() || flow.root;
    return { type: 'message', text: this.renderNode(flow.nodes[session.currentNodeId]), event: `menu:${session.currentNodeId}` };
  }

  handle(contactId, text) {
    const config = this.config();
    if (!config.enabled) return { type: 'disabled' };
    const flow = this.getFlow();
    const input = this.normalize(text);
    const menuCommands = new Set(['menu', 'início', 'inicio', 'começar', 'comecar']);
    const backCommands = new Set(['0', 'voltar']);
    const { session, isNew } = this.getSession(contactId, flow);

    if (menuCommands.has(input)) return this.goToRoot(session, flow);
    if (backCommands.has(input)) return this.goBack(session, flow);
    if (session.handedOff) return { type: 'handoff-active' };
    if (isNew) return { type: 'message', text: this.renderNode(flow.nodes[flow.root]), event: 'menu:root' };

    const node = flow.nodes[session.currentNodeId];
    if (node.type !== 'menu') return { type: 'message', text: this.renderNode(node), event: `message:${node.id}` };
    const option = node.options.find(item => this.normalize(item.key) === input);
    if (!option) return { type: 'message', text: `${config.invalidOptionMessage}\n\n${this.renderNode(node)}`, event: `invalid:${node.id}` };

    if (option.action === 'handoff') {
      session.handedOff = true;
      this.log(`👤 Atendimento humano solicitado por ${contactId}.`);
      return { type: 'message', text: option.response || config.handoffMessage, event: 'handoff' };
    }
    if (option.target && flow.nodes[option.target]) {
      session.history.push(node.id);
      session.currentNodeId = option.target;
      return { type: 'message', text: this.renderNode(flow.nodes[option.target]), event: `node:${option.target}` };
    }
    return { type: 'message', text: `${option.response}\n\nDigite *0* para voltar.`, event: `option:${node.id}:${option.key}` };
  }
}

module.exports = { ConversationFlowService, DEFAULT_MENU_OPTIONS, sanitizeFlowDefinition, sanitizeOptions };
