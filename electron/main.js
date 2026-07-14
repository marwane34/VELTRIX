const { app, BrowserWindow, ipcMain, Notification, nativeTheme, Tray, Menu, shell } = require('electron');
const path = require('path');
const isDev = !!process.env.VITE_DEV_SERVER_URL;

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    backgroundColor: '#060b14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  tray = new Tray(path.join(__dirname, '..', 'assets', 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show VELTRIX', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'Toggle Fullscreen', click: () => { if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen()); } },
    { label: 'Toggle Dark Mode', click: () => { nativeTheme.themeSource = nativeTheme.themeSource === 'dark' ? 'light' : 'dark'; } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip('VELTRIX SCADA');
  tray.on('click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximizeToggle', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) { mainWindow.unmaximize(); return false; }
  else { mainWindow.maximize(); return true; }
});
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:toggleFullscreen', () => {
  if (!mainWindow) return false;
  const fs = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(fs);
  return fs;
});
ipcMain.handle('window:isFullscreen', () => mainWindow?.isFullScreen() ?? false);

ipcMain.handle('theme:get', () => nativeTheme.themeSource);
ipcMain.handle('theme:toggle', () => {
  nativeTheme.themeSource = nativeTheme.themeSource === 'dark' ? 'light' : 'dark';
  return nativeTheme.themeSource;
});
ipcMain.handle('theme:set', (_, theme) => { nativeTheme.themeSource = theme; return nativeTheme.themeSource; });

ipcMain.handle('notification:show', (_, title, body) => {
  if (Notification.isSupported()) new Notification({ title, body }).show();
});

ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('autoLaunch:get', () => app.getLoginItemSettings().openAtLogin);
ipcMain.handle('autoLaunch:set', (_, enabled) => {
  app.setLoginItemSettings({ openAtLogin: enabled });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('update:check', async () => { return false; });
ipcMain.handle('update:download', async () => {});
ipcMain.handle('update:install', async () => {});
