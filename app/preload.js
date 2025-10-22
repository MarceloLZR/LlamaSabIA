const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  checkServerStatus: () => ipcRenderer.invoke('check-server-status')
});