// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Status / Logs / QR
  onQr: (cb) => ipcRenderer.on('bot:qr', (_e, dataUrl) => cb(dataUrl)),
  onStatus: (cb) => ipcRenderer.on('bot:status', (_e, payload) => cb(payload)),
  onLog: (cb) => ipcRenderer.on('bot:log', (_e, payload) => cb(payload)),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  onSettingsUpdated: (cb) => ipcRenderer.on('settings:updated', (_e, s) => cb(s)),

  // Sessão
  logout: () => ipcRenderer.invoke('bot:logout'),

  // Envio individual
  sendMessage: (to, message) => ipcRenderer.invoke('bot:sendMessage', { to, message }),

  // Disparo em massa (agora aceita lista customizada)
  bulkPreview: (args) => ipcRenderer.invoke('bot:bulkPreview', args),
  bulkStart: (args) => ipcRenderer.invoke('bot:bulkStart', args),
  bulkPause: () => ipcRenderer.invoke('bot:bulkPause'),
  bulkResume: () => ipcRenderer.invoke('bot:bulkResume'),
  bulkCancel: () => ipcRenderer.invoke('bot:bulkCancel'),
  onBulkProgress: (cb) => ipcRenderer.on('bulk:progress', (_e, payload) => cb(payload)),

  // Licença
  licenseGet: () => ipcRenderer.invoke('license:get'),
  licenseSet: (key) => ipcRenderer.invoke('license:set', key),
  licenseReset: () => ipcRenderer.invoke('license:reset'),
  onLicenseStatus: (cb) => ipcRenderer.on('license:status', (_e, st) => cb(st)),

  // Privacidade / Blacklist
  blacklistGet: () => ipcRenderer.invoke('privacy:blacklist:get'),
  blacklistRemove: (id) => ipcRenderer.invoke('privacy:blacklist:remove', id),
  blacklistClear: () => ipcRenderer.invoke('privacy:blacklist:clear'),
  onPrivacyEvent: (cb) => ipcRenderer.on('privacy:event', (_e, p) => cb(p)),
});
