const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  exportData: data => ipcRenderer.invoke("export-data", data),
  importData: () => ipcRenderer.invoke("import-data"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  isElectron: true,
});
