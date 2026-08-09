const { sanitizeSchedule } = require('../../utils/schedule');

function registerSettingsHandlers(ipcMain, { settings, log }) {
  ipcMain.handle('settings:get', () => settings.get());
  ipcMain.handle('settings:set', async (_event, payload = {}) => {
    const current = settings.get(); const next = {};
    if (typeof payload.autoReplyText === 'string') next.autoReplyText = payload.autoReplyText.trim() || current.autoReplyText;
    if (payload.autoReplyCooldownMs != null) next.autoReplyCooldownMs = payload.autoReplyCooldownMs;
    if (payload.autoReplySchedule) next.autoReplySchedule = sanitizeSchedule(payload.autoReplySchedule);
    if (payload.batchDelayMs != null) next.batchDelayMs = payload.batchDelayMs;
    if (payload.batchJitterPct != null) next.batchJitterPct = payload.batchJitterPct;
    if (Array.isArray(payload.blacklist)) next.blacklist = payload.blacklist.filter(id => typeof id === 'string' && id.endsWith('@c.us'));
    if (payload.automation && typeof payload.automation === 'object') next.automation = payload.automation;
    const saved = await settings.save(next); log('⚙️ Configurações atualizadas.'); return saved;
  });
}
module.exports = { registerSettingsHandlers };
