function registerBulkHandlers(ipcMain, { bulk }) {
  ipcMain.handle('bot:bulkPreview', (_event, { mode, list }) => bulk.preview(mode, list));
  ipcMain.handle('bot:bulkStart', (_event, payload) => bulk.start(payload));
  ipcMain.handle('bot:bulkPause', () => bulk.pause());
  ipcMain.handle('bot:bulkResume', () => bulk.resume());
  ipcMain.handle('bot:bulkCancel', () => bulk.cancel());
}
module.exports = { registerBulkHandlers };
