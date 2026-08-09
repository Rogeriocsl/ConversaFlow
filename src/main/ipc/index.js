const { registerBotHandlers } = require('./botHandlers');
const { registerBulkHandlers } = require('./bulkHandlers');
const { registerSettingsHandlers } = require('./settingsHandlers');
const { registerPrivacyHandlers } = require('./privacyHandlers');
const { registerLicenseHandlers } = require('./licenseHandlers');

function registerIpcHandlers(ipcMain, dependencies) {
  registerBotHandlers(ipcMain, dependencies);
  registerBulkHandlers(ipcMain, dependencies);
  registerSettingsHandlers(ipcMain, dependencies);
  registerPrivacyHandlers(ipcMain, dependencies);
  registerLicenseHandlers(ipcMain, dependencies);
}
module.exports = { registerIpcHandlers };
