const DEFAULT_MENU_OPTIONS = Object.freeze([
  { key: '1', label: 'Conhecer nossos produtos', response: 'Confira nosso catálogo e conheça todos os produtos disponíveis.' },
  { key: '2', label: 'Consultar preços', response: 'Informe qual produto você deseja consultar e nossa equipe enviará os preços.' },
  { key: '3', label: 'Fazer um pedido', response: 'Para iniciar seu pedido, envie os produtos e as quantidades desejadas.' },
  { key: '4', label: 'Horário de atendimento', response: 'Nosso horário de atendimento está disponível nesta conversa. Em breve responderemos sua mensagem.' },
  { key: '5', label: 'Endereço', response: 'Envie sua cidade ou bairro para receber o endereço da unidade mais próxima.' },
  { key: '9', label: 'Falar com um atendente', action: 'handoff', response: 'Certo! Encaminhamos sua conversa para um atendente. Aguarde um momento.' },
]);

class ConversationFlowService {
  constructor({ settingsService, log = () => {} }) {
    this.settings = settingsService;
    this.log = log;
    this.sessions = new Map();
  }

  config() { return this.settings.get().automation; }
  normalize(value) { return String(value || '').trim().toLocaleLowerCase('pt-BR'); }
  reset(contactId) { this.sessions.delete(contactId); }

  getSession(contactId) {
    const timeoutMs = this.config().sessionTimeoutMinutes * 60000;
    const session = this.sessions.get(contactId);
    if (!session || Date.now() - session.updatedAt > timeoutMs) {
      const fresh = { state: 'menu', handedOff: false, updatedAt: Date.now() };
      this.sessions.set(contactId, fresh);
      return { session: fresh, isNew: true };
    }
    session.updatedAt = Date.now();
    return { session, isNew: false };
  }

  renderMenu() {
    const config = this.config();
    const options = config.options.map(option => `${option.key} - ${option.label}`).join('\n');
    return `${config.welcomeMessage}\n\n${options}\n\n${config.footerMessage}`.trim();
  }

  handle(contactId, text) {
    const config = this.config();
    if (!config.enabled) return { type: 'disabled' };
    const input = this.normalize(text);
    const menuCommands = new Set(['menu', 'início', 'inicio', 'começar', 'comecar']);
    const backCommands = new Set(['0', 'voltar']);
    const { session, isNew } = this.getSession(contactId);

    if (menuCommands.has(input) || backCommands.has(input)) {
      session.handedOff = false;
      session.state = 'menu';
      return { type: 'message', text: this.renderMenu(), event: 'menu' };
    }
    if (session.handedOff) return { type: 'handoff-active' };
    if (isNew) return { type: 'message', text: this.renderMenu(), event: 'menu' };

    const option = config.options.find(item => this.normalize(item.key) === input);
    if (!option) return { type: 'message', text: `${config.invalidOptionMessage}\n\n${this.renderMenu()}`, event: 'invalid' };
    if (option.action === 'handoff') {
      session.handedOff = true;
      session.state = 'handoff';
      this.log(`👤 Atendimento humano solicitado por ${contactId}.`);
      return { type: 'message', text: option.response || config.handoffMessage, event: 'handoff' };
    }
    session.state = 'menu';
    return { type: 'message', text: `${option.response}\n\nDigite *0* para voltar ao menu.`, event: `option:${option.key}` };
  }
}

module.exports = { ConversationFlowService, DEFAULT_MENU_OPTIONS };
