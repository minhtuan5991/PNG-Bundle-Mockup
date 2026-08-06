'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('bundleApi', {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  getUpdateStatus: () => ipcRenderer.invoke('update:get-status'),
  checkForUpdates: (options = {}) => ipcRenderer.invoke('update:check', options),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  selectSourceFolder: () => ipcRenderer.invoke('dialog:select-source-folder'),
  getDroppedFilePath: (file) => webUtils.getPathForFile(file),
  inspectDroppedPngFiles: (filePaths) =>
    ipcRenderer.invoke('source:inspect-dropped-png-files', filePaths),
  getInputAssets: () => ipcRenderer.invoke('input:get-assets'),
  saveSingleMockupRegions: (entries) =>
    ipcRenderer.invoke('input:save-single-mockup-regions', entries),
  setEditorState: (value) => ipcRenderer.send('window:set-editor-state', value),
  selectTemplate: () => ipcRenderer.invoke('dialog:select-template'),
  selectWatermark: () => ipcRenderer.invoke('dialog:select-watermark'),
  renderPreview: (payload) => ipcRenderer.invoke('preview:render', payload),
  generateMockups: (payload) => ipcRenderer.invoke('mockup:generate', payload),
  cancelJob: () => ipcRenderer.invoke('job:cancel'),
  openPath: (targetPath) => ipcRenderer.invoke('shell:open-path', targetPath),
  onProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('job:progress', listener);
    return () => ipcRenderer.removeListener('job:progress', listener);
  },
  onUpdateStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
});
