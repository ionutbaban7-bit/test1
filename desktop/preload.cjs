// Preload — punem la dispozitia jocului o punte mica si sigura spre salvarea pe disc.
// Jocul NU primeste acces la Node: doar load/store pentru fisierul de save.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bvDesktop', {
  loadSave: () => ipcRenderer.sendSync('save:load'),
  storeSave: (raw) => ipcRenderer.sendSync('save:store', raw),
  platform: process.platform,
});
