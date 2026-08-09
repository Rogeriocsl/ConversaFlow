const { BrowserWindow } = require('electron');
const path = require('path');

function createWindow({ preloadPath, rendererPath, openDevTools = false }) {
  const window = new BrowserWindow({ width: 1000, height: 720, show: false, webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false } });
  window.once('ready-to-show', () => window.show());
  window.loadFile(rendererPath);
  if (openDevTools) window.webContents.openDevTools({ mode: 'detach' });
  return window;
}

function pathsFrom(rootPath) {
  return { preloadPath: path.join(rootPath, 'preload.js'), rendererPath: path.join(rootPath, 'src', 'renderer', 'index.html') };
}
module.exports = { createWindow, pathsFrom };
