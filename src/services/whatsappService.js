const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const puppeteer = require('puppeteer');
const { isNowWithinSchedule, formatSchedule } = require('../utils/schedule');
const { toChatId } = require('../utils/phone');

class WhatsAppService {
  constructor({ app, clientId, dataPath, settingsService, privacyService, licenseService, conversationFlowService, events }) {
    this.app = app; this.clientId = clientId; this.dataPath = dataPath;
    this.settings = settingsService; this.privacy = privacyService; this.license = licenseService; this.events = events;
    this.conversation = conversationFlowService;
    this.client = null; this.ready = false; this.qrTimer = null; this.silencedUntil = new Map();
    this.manualReset = false;
  }
  log(text) { this.events.log(text); }
  assertReady() { this.license.assertValid(); if (!this.client || !this.ready) throw new Error('Cliente não está pronto'); }
  isReady() { return Boolean(this.client && this.ready); }
  isSilenced(id) { return Date.now() < (this.silencedUntil.get(id) || 0); }
  silence(id) { this.silencedUntil.set(id, Date.now() + this.settings.getCooldownMs()); }
  clearWatchdog() { if (this.qrTimer) clearTimeout(this.qrTimer); this.qrTimer = null; }
  armWatchdog(timeout = 30000) {
    this.clearWatchdog();
    this.qrTimer = setTimeout(async () => { this.log('⏱️ Timeout aguardando QR/READY — reinicializando cliente.'); await this.destroy(); this.setup(); }, timeout);
  }
  resolveChromiumPath() {
    try { const executable = puppeteer.executablePath(); if (executable && fs.existsSync(executable)) return executable; } catch {}
    try {
      const root = this.app.getAppPath().replace(/app\.asar$/i, 'app.asar.unpacked');
      const stack = [path.join(root, 'node_modules', 'puppeteer', '.local-chromium')];
      while (stack.length) {
        const current = stack.pop(); if (!fs.existsSync(current)) continue;
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) stack.push(full); else if (/^chrome\.exe$/i.test(entry.name)) return full;
        }
      }
    } catch {}
    return null;
  }
  puppeteerOptions() {
    const options = { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-zygote', '--disable-dev-shm-usage'] };
    if (!this.app.isPackaged) return options;
    const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const executable = fs.existsSync(chrome) ? chrome : this.resolveChromiumPath();
    if (executable) { options.executablePath = executable; process.env.PUPPETEER_EXECUTABLE_PATH = executable; this.log(`🧭 Navegador em produção: ${executable}`); }
    else this.log('⛔ Não achei Chromium nem Google Chrome em produção.');
    return options;
  }
  setup() {
    if (!this.license.isValid()) { this.log('⛔ Inicialização abortada: sem licença válida.'); return; }
    if (this.client) { this.log('(cliente) Inicialização ignorada: cliente já existe.'); return; }
    this.ready = false;
    const client = new Client({ authStrategy: new LocalAuth({ clientId: this.clientId, dataPath: this.dataPath }), puppeteer: this.puppeteerOptions() });
    this.client = client;
    client.on('loading_screen', (pct, msg) => this.log(`⏳ WA loading: ${pct || 0}% ${msg || ''}`));
    client.on('change_state', state => this.log(`📶 WA state: ${state}`));
    client.on('qr', async qr => { if (client !== this.client) return; this.events.status('qr'); this.events.qr(await QRCode.toDataURL(qr, { width: 400 })); this.log('✅ QR gerado. Escaneie com seu WhatsApp.'); this.clearWatchdog(); });
    client.on('authenticated', () => { if (client !== this.client) return; this.events.status('authenticated'); this.log('✅ Autenticado.'); this.clearWatchdog(); });
    client.on('ready', () => { if (client !== this.client) return; this.ready = true; this.events.status('ready'); this.log('🤖 Bot pronto.'); this.clearWatchdog(); });
    client.on('auth_failure', reason => { if (client !== this.client) return; this.ready = false; this.events.status('auth_failure', { reason }); this.log(`❌ Falha de autenticação: ${reason}`); this.clearWatchdog(); });
    client.on('disconnected', async reason => {
      if (client !== this.client || this.manualReset) return;
      this.ready = false;
      this.events.status('disconnected', { reason });
      this.log(`🔌 Desconectado: ${reason} — reinicializando...`);
      await this.destroy();
      this.setup();
    });
    client.on('message', message => {
      if (client !== this.client) return;
      this.handleIncoming(message).catch(error => this.log(`Erro ao processar mensagem recebida: ${error?.stack || error}`));
    });
    client.initialize(); this.armWatchdog();
  }
  async handleIncoming(message) {
    if (!this.license.isValid()) return;
    const from = String(message.from || '');
    const body = (message.body || '').trim();
    if (!from || message.fromMe) return;
    if (from.endsWith('@g.us')) return this.log(`(grupo ignorado) ${from}: ${body}`);
    if (from === 'status@broadcast' || from.endsWith('@newsletter')) return;
    if (!from.endsWith('@c.us') && !from.endsWith('@lid')) return this.log(`(origem ignorada) ${from}`);
    if (/^\s*(sair|parar|stop|cancelar)\s*$/i.test(body)) { await this.privacy.add(from); try { await this.client.sendMessage(from, '✅ Você foi removido da nossa lista. Não enviaremos mais mensagens.'); } catch {} this.silence(from); return; }
    if (this.privacy.has(from)) return this.log(`(blacklist) Ignorando ${from}`);
    const schedule = this.settings.get().autoReplySchedule;
    if (!isNowWithinSchedule(schedule)) return this.log(`(horário) Fora da janela configurada (${formatSchedule(schedule)}). Sem auto-reply para ${from}.`);
    const result = await this.conversation.handle(from, body);
    if (result.type !== 'message') return;
    try {
      await this.client.sendMessage(from, result.text);
      this.log(`Automação [${result.event}] → ${from}`);
    } catch (error) { this.log(`Erro na automação para ${from}: ${error.message}`); }
  }
  async send(to, message) { this.assertReady(); const id = toChatId(to); if (!id) throw new Error('Número inválido'); if (this.privacy.has(id)) throw new Error('Número está na blacklist (opt-out)'); await this.client.sendMessage(id, message); this.log(`➡️ Enviado para ${id}: ${message}`); }
  async destroy() {
    this.clearWatchdog();
    const client = this.client;
    this.client = null;
    this.ready = false;
    try { await client?.destroy(); } catch {}
  }
  async logout() {
    this.license.assertValid();
    this.manualReset = true;
    try {
      const client = this.client;
      if (client) {
        try { await client.logout(); }
        catch (error) { this.log(`Aviso: logout falhou (prosseguindo): ${error.message}`); }
      }
      await this.destroy();
      await this.deleteSessions();
      this.events.qr(null);
      this.events.status('qr');
    } finally {
      this.manualReset = false;
    }
    this.setup();
  }
  async deleteSessions() { await fsp.mkdir(this.dataPath, { recursive: true }); for (const entry of await fsp.readdir(this.dataPath, { withFileTypes: true })) if (entry.isDirectory() && entry.name.startsWith(`session-${this.clientId}`)) await fsp.rm(path.join(this.dataPath, entry.name), { recursive: true, force: true }); }
  getClient() { return this.client; }
}
module.exports = { WhatsAppService };
