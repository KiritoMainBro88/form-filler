import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Form scanning
  scanForm: (formUrl: string) => ipcRenderer.invoke('scan-form', formUrl),
  
  // Config management
  saveConfig: (config: any, configName?: string) => ipcRenderer.invoke('save-config', config, configName),
  loadConfig: (configName: string) => ipcRenderer.invoke('load-config', configName),
  listConfigs: () => ipcRenderer.invoke('list-configs'),
  
  // Form filling
  startFilling: (config: any) => ipcRenderer.invoke('start-filling', config),
  
  // File selection
  selectFile: () => ipcRenderer.invoke('select-file'),
  
  // Progress updates
  onFillingProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('filling-progress', (_event, progress) => callback(progress));
  },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      scanForm: (formUrl: string) => Promise<any>;
      saveConfig: (config: any, configName?: string) => Promise<string>;
      loadConfig: (configName: string) => Promise<any>;
      listConfigs: () => Promise<string[]>;
      startFilling: (config: any) => Promise<any>;
      selectFile: () => Promise<any>;
      onFillingProgress: (callback: (progress: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
