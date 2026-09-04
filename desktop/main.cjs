// Electron main process — fereastra de joc pentru versiunea desktop (Windows/macOS/Linux).
// Ruleaza build-ul Vite din /dist (release) sau serverul de dev (variabila VITE_DEV_SERVER_URL).
// Salvarile jocului merg in fisier JSON in userData (nu in localStorage de browser).
'use strict';
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const SAVE_FILE = () => path.join(app.getPath('userData'), 'bv-save.json');

// --- persistare locala (sync, fisier mic) ---
ipcMain.on('save:load', (e) => {
  try {
    if (fs.existsSync(SAVE_FILE())) e.returnValue = fs.readFileSync(SAVE_FILE(), 'utf8');
    else e.returnValue = null;
  } catch {
    e.returnValue = null;
  }
});
ipcMain.on('save:store', (e, raw) => {
  try {
    fs.mkdirSync(path.dirname(SAVE_FILE()), { recursive: true });
    fs.writeFileSync(SAVE_FILE(), String(raw));
    e.returnValue = true;
  } catch {
    e.returnValue = false;
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#05070d',
    title: 'BUCUREȘTI VICE',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);

  // linkurile se deschid in browser, nu in fereastra jocului
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // F11 = fullscreen
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
