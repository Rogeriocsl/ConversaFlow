(function () {
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clone = value => JSON.parse(JSON.stringify(value));

  class FlowEditor {
    constructor(root, onChange = () => {}) {
      this.root = root;
      this.onChange = onChange;
      this.state = { root: 'main', selected: 'main', menus: { main: { id: 'main', name: 'Menu principal', message: 'Olá! Como podemos ajudar?', options: [] } } };
      this.bind(); this.render();
    }

    bind() {
      this.root.addEventListener('click', event => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        if (action === 'add-menu') this.addMenu();
        if (action === 'remove-menu') this.removeMenu();
        if (action === 'add-option') this.addOption();
        if (action === 'remove-option') this.removeOption(event.target.closest('[data-option-id]')?.dataset.optionId);
      });
      this.root.addEventListener('change', event => this.update(event));
      this.root.addEventListener('input', event => this.update(event));
    }

    load(automation = {}) {
      const flow = automation.flow;
      if (flow?.nodes?.[flow.root]) this.state = this.fromFlow(flow);
      else {
        this.state = { root: 'main', selected: 'main', menus: { main: {
          id: 'main', name: 'Menu principal', message: automation.welcomeMessage || 'Olá! Como podemos ajudar?',
          options: (automation.options || []).map(option => ({ id: uid(), key: option.key, label: option.label, action: option.action === 'handoff' ? 'handoff' : 'response', response: option.response || '' })),
        } } };
      }
      this.render();
    }

    fromFlow(flow) {
      const menus = {};
      for (const [id, node] of Object.entries(flow.nodes)) {
        if (node.type !== 'menu') continue;
        menus[id] = { id, name: id === flow.root ? 'Menu principal' : id, message: node.message || '', options: [] };
        for (const option of node.options || []) {
          const target = option.target && flow.nodes[option.target];
          if (option.action === 'handoff') menus[id].options.push({ id: uid(), key: option.key, label: option.label, action: 'handoff', response: option.response || '' });
          else if (target?.type === 'collect') menus[id].options.push({ id: uid(), key: option.key, label: option.label, action: 'collect', field: target.field || '', prompt: target.message || '', target: target.target || flow.root });
          else if (target?.type === 'menu') menus[id].options.push({ id: uid(), key: option.key, label: option.label, action: 'submenu', target: option.target });
          else menus[id].options.push({ id: uid(), key: option.key, label: option.label, action: 'response', response: option.response || '' });
        }
      }
      if (!menus[flow.root]) menus[flow.root] = { id: flow.root, name: 'Menu principal', message: '', options: [] };
      return { root: flow.root, selected: flow.root, menus };
    }

    addMenu() {
      let id = `menu-${Object.keys(this.state.menus).length + 1}`;
      while (this.state.menus[id]) id = `menu-${uid()}`;
      this.state.menus[id] = { id, name: `Novo menu`, message: 'Escolha uma opção:', options: [] };
      this.state.selected = id; this.changed();
    }

    removeMenu() {
      const id = this.state.selected;
      if (id === this.state.root) return alert('O menu principal não pode ser removido.');
      delete this.state.menus[id];
      for (const menu of Object.values(this.state.menus)) for (const option of menu.options) if (option.target === id) option.target = '';
      this.state.selected = this.state.root; this.changed();
    }

    addOption() {
      this.current().options.push({ id: uid(), key: String(this.current().options.length + 1), label: 'Nova opção', action: 'response', response: '' });
      this.changed();
    }

    removeOption(id) { this.current().options = this.current().options.filter(option => option.id !== id); this.changed(); }
    current() { return this.state.menus[this.state.selected]; }

    update(event) {
      const field = event.target.dataset.field;
      if (!field) return;
      if (field === 'selected') { this.state.selected = event.target.value; return this.render(); }
      if (field === 'menu-name' || field === 'menu-message') this.current()[field === 'menu-name' ? 'name' : 'message'] = event.target.value;
      else {
        const option = this.current().options.find(item => item.id === event.target.closest('[data-option-id]')?.dataset.optionId);
        if (option) option[field] = event.target.value;
      }
      this.changed(field === 'action');
    }

    changed(fullRender = false) { this.onChange(this.getFlow()); fullRender ? this.render() : this.renderPreview(); }

    menuOptions(selected = '') {
      return Object.values(this.state.menus).map(menu => `<option value="${menu.id}" ${menu.id === selected ? 'selected' : ''}>${this.escape(menu.name)} (${menu.id})</option>`).join('');
    }

    actionFields(option) {
      if (option.action === 'submenu') return `<label>Submenu de destino</label><select data-field="target"><option value="">Selecione...</option>${this.menuOptions(option.target)}</select>`;
      if (option.action === 'collect') return `<div class="flow-grid"><div><label>Campo</label><input data-field="field" value="${this.escape(option.field || '')}" placeholder="nome" /></div><div><label>Próximo menu</label><select data-field="target">${this.menuOptions(option.target || this.state.root)}</select></div></div><label>Pergunta</label><input data-field="prompt" value="${this.escape(option.prompt || '')}" placeholder="Qual é o seu nome?" />`;
      return `<label>${option.action === 'handoff' ? 'Mensagem de transferência' : 'Resposta'}</label><textarea data-field="response" rows="2">${this.escape(option.response || '')}</textarea>`;
    }

    render() {
      const menu = this.current();
      this.root.innerHTML = `<div class="flow-toolbar"><select data-field="selected">${this.menuOptions(this.state.selected)}</select><button type="button" class="btn secondary" data-action="add-menu">+ Menu</button><button type="button" class="btn danger" data-action="remove-menu" ${menu.id === this.state.root ? 'disabled' : ''}>Remover menu</button></div>
        <div class="flow-menu-card"><label>Nome interno</label><input data-field="menu-name" value="${this.escape(menu.name)}" /><label>Mensagem do menu</label><textarea data-field="menu-message" rows="3">${this.escape(menu.message)}</textarea></div>
        <div class="flow-options">${menu.options.map(option => `<div class="flow-option" data-option-id="${option.id}"><div class="flow-grid"><div><label>Número</label><input data-field="key" value="${this.escape(option.key)}" /></div><div><label>Título</label><input data-field="label" value="${this.escape(option.label)}" /></div><div><label>Ação</label><select data-field="action">${['response:Responder','submenu:Abrir submenu','collect:Coletar dado','handoff:Atendente'].map(item => { const [value,label]=item.split(':'); return `<option value="${value}" ${option.action===value?'selected':''}>${label}</option>`; }).join('')}</select></div></div>${this.actionFields(option)}<button type="button" class="btn danger flow-remove" data-action="remove-option">Remover opção</button></div>`).join('')}</div>
        <button type="button" class="btn secondary" data-action="add-option">+ Adicionar opção</button><div class="flow-preview-wrap"><h5>Pré-visualização do fluxo</h5><pre id="flow-visual-preview"></pre></div>`;
      this.renderPreview();
    }

    getFlow() {
      const nodes = {};
      for (const menu of Object.values(this.state.menus)) {
        nodes[menu.id] = { type: 'menu', message: menu.message, options: menu.options.map(option => {
          const base = { key: option.key, label: option.label };
          if (option.action === 'submenu') return { ...base, target: option.target };
          if (option.action === 'collect') { const collectId = `collect-${menu.id}-${option.id}`; nodes[collectId] = { type: 'collect', message: option.prompt, field: option.field, target: option.target || this.state.root }; return { ...base, target: collectId }; }
          if (option.action === 'handoff') return { ...base, action: 'handoff', response: option.response || '' };
          return { ...base, response: option.response || '' };
        }) };
      }
      return { root: this.state.root, nodes };
    }

    validate() {
      const errors = [];
      for (const menu of Object.values(this.state.menus)) {
        const keys = new Set();
        for (const option of menu.options) {
          if (!option.key || !option.label) errors.push(`${menu.name}: opção sem número ou título`);
          if (keys.has(option.key)) errors.push(`${menu.name}: número ${option.key} duplicado`); keys.add(option.key);
          if (option.action === 'submenu' && !this.state.menus[option.target]) errors.push(`${menu.name}: submenu de destino ausente`);
          if (option.action === 'collect' && (!option.field || !option.prompt)) errors.push(`${menu.name}: coleta sem campo ou pergunta`);
        }
      }
      return errors;
    }

    renderPreview() {
      const preview = this.root.querySelector('#flow-visual-preview'); if (!preview) return;
      const lines = [], visited = new Set();
      const walk = (id, indent) => {
        const menu = this.state.menus[id]; if (!menu) return lines.push(`${indent}⚠ destino inexistente`);
        lines.push(`${indent}📋 ${menu.name}`); if (visited.has(id)) return lines.push(`${indent}  ↩ ciclo`); visited.add(id);
        for (const option of menu.options) { lines.push(`${indent}  ${option.key}. ${option.label} [${option.action}]`); if (option.action === 'submenu') walk(option.target, `${indent}    `); }
        visited.delete(id);
      };
      walk(this.state.root, ''); const errors = this.validate();
      preview.textContent = `${lines.join('\n')}${errors.length ? `\n\n⚠ ${errors.join('\n⚠ ')}` : ''}`;
    }

    escape(value) { return String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char])); }
  }

  window.FlowEditor = FlowEditor;
})();
