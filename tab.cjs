
const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

let mainWindow;
let updateDialogOpen = false;
let checkingForUpdates = false;

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
    if (!app.isPackaged) {
        console.log("Updater overgeslagen: game draait niet als geïnstalleerde app.");
        return;
    }

    if (checkingForUpdates) return;

    checkingForUpdates = true;

    console.log("--------------------------------");
    console.log("NOAH GAME UPDATE CHECK");
    console.log("Geïnstalleerde versie:", app.getVersion());
    console.log("Controleren op nieuwe versie...");
    console.log("--------------------------------");

    try {
        await autoUpdater.checkForUpdates();
    } catch (error) {
        console.error("NOAH GAME update check failed:", error);
    } finally {
        checkingForUpdates = false;
    }
}

autoUpdater.on("checking-for-update", () => {
    console.log("NOAH GAME controleert op updates...");
});

autoUpdater.on("update-available", async (info) => {
    console.log("NIEUWE UPDATE GEVONDEN:", info.version);

    if (updateDialogOpen) return;

    updateDialogOpen = true;

    try {
        const result = await dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "NEED UPDATE",
            message: "A new version of NOAH GAME is available!",
            detail: `Installed version: ${app.getVersion()}\nNew version: ${info.version}\n\nWould you like to update NOAH GAME now?`,
            buttons: ["UPDATE NOW", "LATER"],
            defaultId: 0,
            cancelId: 1,
            noLink: true
        });

        if (result.response === 0) {
            console.log("NOAH GAME update downloaden...");
            await autoUpdater.downloadUpdate();
        } else {
            console.log("Gebruiker heeft update uitgesteld.");
        }
    } catch (error) {
        console.error("NOAH GAME update dialog failed:", error);
    } finally {
        updateDialogOpen = false;
    }
});

autoUpdater.on("update-not-available", (info) => {
    console.log("GEEN NIEUWE UPDATE BESCHIKBAAR.");
    console.log("Huidige versie:", app.getVersion());
    console.log("GitHub-versie:", info.version);
});

autoUpdater.on("download-progress", (progress) => {
    console.log(
        `Update downloaden: ${Math.round(progress.percent)}%`
    );
});

autoUpdater.on("update-downloaded", async (info) => {
    console.log("UPDATE VOLTOOID:", info.version);

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
    console.error("NOAH GAME UPDATER ERROR:", error);
});

app.whenReady().then(() => {
    createWindow();

    console.log("NOAH GAME gestart.");
    console.log("Versie:", app.getVersion());
    console.log("Is packaged:", app.isPackaged);

    // Eerste updatecontrole na 8 seconden.
    setTimeout(checkForUpdates, 8000);

    // Daarna iedere vier uur.
    setInterval(checkForUpdates, 4 * 60 * 60 * 1000);
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
