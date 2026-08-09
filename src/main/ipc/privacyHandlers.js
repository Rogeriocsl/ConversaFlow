function registerPrivacyHandlers(ipcMain, { privacy }) {
  ipcMain.handle('privacy:blacklist:get', () => ({ blacklist: privacy.list() }));
  ipcMain.handle('privacy:blacklist:remove', async (_event, id) => ({ blacklist: await privacy.remove(String(id || '')) }));
  ipcMain.handle('privacy:blacklist:clear', async () => ({ blacklist: await privacy.clear() }));
}
module.exports = { registerPrivacyHandlers };
