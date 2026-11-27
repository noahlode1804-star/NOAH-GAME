const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

let mainWindow;
let updateDialogOpen = false;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = console;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        title: "NOAH GAME",
        backgroundColor: "#050a13",
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    mainWindow.webContents.on("before-input-event", (event, input) => {
        if (input.type === "keyDown" && input.key === "Escape") {
            event.preventDefault();

            mainWindow.webContents.executeJavaScript(`
                document.dispatchEvent(
                    new KeyboardEvent("keydown", {
                        key: "Escape",
                        code: "Escape",
                        bubbles: true,
                        cancelable: true
                    })
                );
            `).catch(() => {});
        }
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));
}

async function checkForUpdates() {
    if (!app.isPackaged) return;

    try {
        await autoUpdater.checkForUpdates();
    } catch (error) {
        console.error("NOAH GAME update check failed:", error);
    }
}

autoUpdater.on("update-available", async (info) => {
    if (updateDialogOpen) return;

    updateDialogOpen = true;

    try {
        const result = await dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "NEED UPDATE",
            message: "A new version of NOAH GAME is available!",
            detail: `New version: ${info.version}\n\nWould you like to update NOAH GAME now?`,
            buttons: ["UPDATE NOW", "LATER"],
            defaultId: 0,
            cancelId: 1,
            noLink: true
        });

        if (result.response === 0) {
            await autoUpdater.downloadUpdate();
        }
    } catch (error) {
        console.error("NOAH GAME update dialog failed:", error);
    } finally {
        updateDialogOpen = false;
    }
});

autoUpdater.on("update-downloaded", async () => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "UPDATE READY",
        message: "NOAH GAME has been updated!",
        detail: "Restart NOAH GAME to finish installing the update.",
        buttons: ["RESTART NOW", "LATER"],
        defaultId: 0,
        cancelId: 1,
        noLink: true
    });

    if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
    }
});

autoUpdater.on("error", (error) => {
    console.error("NOAH GAME updater error:", error);
});

app.whenReady().then(() => {
    createWindow();

    // Controleer na het opstarten op updates.
    setTimeout(checkForUpdates, 8000);

    // Controleer daarna iedere vier uur opnieuw.
    setInterval(checkForUpdates, 4 * 60 * 60 * 1000);
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});