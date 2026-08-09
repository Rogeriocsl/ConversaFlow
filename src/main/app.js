const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
require('dotenv').config();
const { createWindow, pathsFrom } = require('./window');
const { registerIpcHandlers } = require('./ipc');
const { SettingsService } = require('../services/settingsService');
const { PrivacyService } = require('../services/privacyService');
const { LicenseService } = require('../services/licenseService');
const { WhatsAppService } = require('../services/whatsappService');
const { BulkMessageService } = require('../services/bulkMessageService');
const { ConversationFlowService } = require('../services/conversationFlowService');
const fs = require('fs');

function loadPublicKey(rootPath) {
  const publicKeyPath = path.join(rootPath, 'public_key.pem');

  try {
    return fs.readFileSync(publicKeyPath, 'utf8').trim();
  } catch {
    throw new Error(`Chave pública não encontrada: ${publicKeyPath}`);
  }
}

function startApplication(rootPath) {
  app.setAppUserModelId('com.conversaflow.desktop');
  if (!app.requestSingleInstanceLock()) { app.quit(); return; }
  let mainWindow = null; let services = null;
  const send = (channel, payload) => mainWindow?.webContents.send(channel, payload);
  const events = {
    log: text => send('bot:log', { ts: Date.now(), text }),
    status: (state, extra = {}) => send('bot:status', { state, ...extra }),
    qr: data => send('bot:qr', data),
    privacy: (evt, payload = {}) => send('privacy:event', { evt, ...payload }),
  };
  const openWindow = () => { mainWindow = createWindow({ ...pathsFrom(rootPath), openDevTools: isDev }); return mainWindow; };

  app.on('second-instance', () => { if (!mainWindow) return openWindow(); if (mainWindow.isMinimized()) mainWindow.restore(); if (!mainWindow.isVisible()) mainWindow.show(); mainWindow.focus(); });
  app.whenReady().then(async () => {
    openWindow();
    const userDataPath = app.getPath('userData');
    const settings = new SettingsService({ userDataPath, onUpdated: value => send('settings:updated', value), log: events.log });
    const license = new LicenseService({
  userDataPath,
  publicKey: loadPublicKey(rootPath),
  onChanged: value => send('license:status', value)
});
    const privacy = new PrivacyService({ settingsService: settings, onEvent: events.privacy, log: events.log });
    const conversation = new ConversationFlowService({ settingsService: settings, log: events.log });
    const whatsapp = new WhatsAppService({ app, clientId: process.env.CLIENT_ID || 'conversaflow', dataPath: process.env.LOCALAUTH_DATA_PATH || path.join(userDataPath, '.wwebjs_auth'), settingsService: settings, privacyService: privacy, licenseService: license, conversationFlowService: conversation, events });
    const bulk = new BulkMessageService({ whatsappService: whatsapp, settingsService: settings, privacyService: privacy, licenseService: license, onProgress: value => send('bulk:progress', value), log: events.log });
    services = { settings, license, privacy, conversation, whatsapp, bulk };
    registerIpcHandlers(ipcMain, { ...services, log: events.log, status: events.status });
    await settings.load(); await license.load();
    if (license.isValid()) whatsapp.setup(); else { events.status('auth_failure', { reason: 'Sem licença válida' }); events.log('⚠️ Sem licença válida. Abra a aba "Licença" para cadastrar.'); }
    setInterval(async () => { const wasValid = license.isValid(); await license.load(); if (wasValid && !license.isValid()) { events.log('⛔ Licença inválida/expirada durante a execução.'); await whatsapp.destroy(); events.status('auth_failure', { reason: 'Licença inválida/expirada' }); } }, 60000);
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) openWindow(); });
  process.on('unhandledRejection', error => events.log(`UNHANDLED: ${error?.stack || error}`));
  process.on('uncaughtException', error => events.log(`UNCAUGHT: ${error?.stack || error}`));
  return () => services;
}
module.exports = { startApplication };
