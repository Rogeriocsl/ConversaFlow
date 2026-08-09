const fs = require('fs/promises');
const path = require('path');
const { clamp, computeJitteredDelay } = require('../utils/delay');
const { DEFAULT_SCHEDULE, sanitizeSchedule, formatSchedule } = require('../utils/schedule');
const { DEFAULT_MENU_OPTIONS } = require('./conversationFlowService');

class SettingsService {
  constructor({ userDataPath, env = process.env, onUpdated = () => {}, log = () => {} }) {
    this.filePath = path.join(userDataPath, 'settings.json');
    this.onUpdated = onUpdated;
    this.log = log;
    this.limits = { minDelay: 300, maxDelay: 10000, minCooldown: 60000, maxCooldown: 86400000 };
    this.defaults = {
      autoReplyText: env.MENU_TEXT || '🍧 Aqui está nosso cardápio: https://seulink-do-cardapio.exemplo',
      autoReplyCooldownMs: Number(env.MUTE_WINDOW_MS || 3600000),
      autoReplySchedule: { ...DEFAULT_SCHEDULE },
      batchDelayMs: Number(env.BATCH_DELAY_MS || 1500),
      batchJitterPct: 0.2,
      blacklist: [],
      automation: {
        enabled: true,
        welcomeMessage: 'Olá! 👋 Como podemos ajudar?',
        footerMessage: 'Responda com o número da opção desejada.',
        invalidOptionMessage: 'Não entendi essa opção. Escolha uma das opções abaixo:',
        handoffMessage: 'Certo! Encaminhamos sua conversa para um atendente.',
        sessionTimeoutMinutes: 30,
        options: DEFAULT_MENU_OPTIONS.map(option => ({ ...option })),
      },
    };
    this.settings = this.sanitize(this.defaults);
  }

  sanitize(value = {}) {
    const source = { ...this.defaults, ...value };
    const text = typeof source.autoReplyText === 'string' && source.autoReplyText.trim()
      ? source.autoReplyText.trim() : this.defaults.autoReplyText;
    const automation = { ...this.defaults.automation, ...(source.automation || {}) };
    const options = Array.isArray(automation.options) ? automation.options
      .filter(option => option && String(option.key || '').trim() && String(option.label || '').trim())
      .map(option => ({
        key: String(option.key).trim(),
        label: String(option.label).trim(),
        response: String(option.response || '').trim(),
        ...(option.action === 'handoff' ? { action: 'handoff' } : {}),
      })) : this.defaults.automation.options;
    return {
      autoReplyText: text,
      autoReplyCooldownMs: clamp(source.autoReplyCooldownMs, this.limits.minCooldown, this.limits.maxCooldown, this.defaults.autoReplyCooldownMs),
      autoReplySchedule: sanitizeSchedule(source.autoReplySchedule),
      batchDelayMs: clamp(source.batchDelayMs, this.limits.minDelay, this.limits.maxDelay, this.defaults.batchDelayMs),
      batchJitterPct: Math.min(0.5, Math.max(0, Number(source.batchJitterPct) || 0)),
      blacklist: Array.isArray(source.blacklist) ? source.blacklist : [],
      automation: {
        enabled: Boolean(automation.enabled),
        welcomeMessage: String(automation.welcomeMessage || this.defaults.automation.welcomeMessage).trim(),
        footerMessage: String(automation.footerMessage || this.defaults.automation.footerMessage).trim(),
        invalidOptionMessage: String(automation.invalidOptionMessage || this.defaults.automation.invalidOptionMessage).trim(),
        handoffMessage: String(automation.handoffMessage || this.defaults.automation.handoffMessage).trim(),
        sessionTimeoutMinutes: clamp(automation.sessionTimeoutMinutes, 1, 1440, 30),
        options,
      },
    };
  }

  get() { return this.settings; }
  getBatchDelay() { return this.settings.batchDelayMs; }
  getJitterPct() { return this.settings.batchJitterPct; }
  getCooldownMs() { return this.settings.autoReplyCooldownMs; }
  computeSendDelay() { return computeJitteredDelay(this.getBatchDelay(), this.getJitterPct(), this.limits.minDelay); }

  async load() {
    try {
      this.settings = this.sanitize(JSON.parse(await fs.readFile(this.filePath, 'utf8')));
    } catch {
      await this.save({});
    }
    return this.settings;
  }

  async save(patch) {
    this.settings = this.sanitize({ ...this.settings, ...(patch || {}) });
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.settings, null, 2), 'utf8');
    this.onUpdated(this.settings);
    const minutes = Math.round(this.settings.autoReplyCooldownMs / 60000);
    this.log(`⚙️ Settings salvos (delay: ${this.settings.batchDelayMs}ms, jitter: ${(this.settings.batchJitterPct * 100) | 0}%, cooldown auto: ${minutes}min, horário: ${formatSchedule(this.settings.autoReplySchedule)}).`);
    return this.settings;
  }
}

module.exports = { SettingsService };
