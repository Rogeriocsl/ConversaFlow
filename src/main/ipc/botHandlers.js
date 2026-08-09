function registerBotHandlers(ipcMain, { whatsapp }) {
  ipcMain.handle('bot:sendMessage', async (_event, payload) => { await whatsapp.send(payload.to, payload.message); return { ok: true }; });
  ipcMain.handle('bot:logout', async () => { await whatsapp.logout(); return { ok: true }; });
}
module.exports = { registerBotHandlers };
