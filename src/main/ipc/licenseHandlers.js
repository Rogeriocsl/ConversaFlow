function registerLicenseHandlers(ipcMain, { license, whatsapp, status }) {
  ipcMain.handle('license:get', () => license.load());
  ipcMain.handle('license:set', async (_event, key) => { const state = await license.set(key); if (!whatsapp.getClient()) whatsapp.setup(); return { ok: true, ...state }; });
  ipcMain.handle('license:reset', async () => { await license.reset(); await whatsapp.destroy(); status('auth_failure', { reason: 'Sem licença válida' }); return { ok: true }; });
}
module.exports = { registerLicenseHandlers };
