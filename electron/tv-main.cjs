const { app, BrowserWindow, powerSaveBlocker, session } = require("electron");

const TV_URL = "https://maintmanager.lovable.app/dashboard/tv";
const APP_ORIGIN = new URL(TV_URL).origin;
const RETRY_DELAY_MS = 15_000;

let retryTimer;
let powerSaveBlockerId;

function isAllowedUrl(url) {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function scheduleReload(win) {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    if (!win.isDestroyed()) win.loadURL(TV_URL);
  }, RETRY_DELAY_MS);
}

function createWindow() {
  const win = new BrowserWindow({
    kiosk: true,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: "#0b0f14",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  win.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedUrl(url)) event.preventDefault();
  });

  win.webContents.on("did-fail-load", (_event, errorCode, _description, validatedUrl, isMainFrame) => {
    if (isMainFrame && errorCode !== -3 && isAllowedUrl(validatedUrl)) scheduleReload(win);
  });

  win.webContents.on("did-finish-load", () => {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = undefined;
  });

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        "Cache-Control": "no-cache",
      },
    });
  });

  win.loadURL(TV_URL);
}

const hasLock = app.requestSingleInstanceLock();

if (!hasLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    powerSaveBlockerId = powerSaveBlocker.start("prevent-display-sleep");
    createWindow();
  });

  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.focus();
  });

  app.on("window-all-closed", () => app.quit());

  app.on("before-quit", () => {
    if (powerSaveBlockerId !== undefined && powerSaveBlocker.isStarted(powerSaveBlockerId)) {
      powerSaveBlocker.stop(powerSaveBlockerId);
    }
  });
}