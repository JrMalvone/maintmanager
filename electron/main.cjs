const { app, BrowserWindow, shell } = require("electron");

// The Windows shell displays the same published app as the Android version.
// Web changes take effect on the next load; shell changes still require a new download.
const APP_URL = "https://maintmanager.lovable.app/";
const APP_ORIGIN = new URL(APP_URL).origin;

function isAppUrl(url) {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function openExternalUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      shell.openExternal(parsed.href);
    }
  } catch {
    // Never pass malformed or non-web schemes to the operating system.
  }
}

function configureNavigation(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    // The app's second-monitor action opens another app window. The blank
    // popup is used when printing a machine QR code.
    if (isAppUrl(url) || url === "about:blank") {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 1440,
          height: 900,
          minWidth: 1024,
          minHeight: 700,
          backgroundColor: "#0b0f14",
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
          },
        },
      };
    }
    openExternalUrl(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url)) return;
    event.preventDefault();
    openExternalUrl(url);
  });

  win.webContents.on("did-create-window", configureNavigation);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0b0f14",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);

  configureNavigation(win);
  win.loadURL(APP_URL, { extraHeaders: "Cache-Control: no-cache" });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
