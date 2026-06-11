import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Scanning
  scanForm: (formUrl: string) => ipcRenderer.invoke('scan-form', formUrl),

  // Answer plan
  buildPlan: (scanResult: any) => ipcRenderer.invoke('build-plan', scanResult),
  validatePlan: (plan: any) => ipcRenderer.invoke('validate-plan', plan),
  exportPlan: (plan: any) => ipcRenderer.invoke('export-plan', plan),
  importPlan: () => ipcRenderer.invoke('import-plan'),

  // Saved configs
  saveConfig: (name: string, plan: any, execution: any) =>
    ipcRenderer.invoke('save-config', name, plan, execution),
  loadConfig: (name: string) => ipcRenderer.invoke('load-config', name),
  listConfigs: () => ipcRenderer.invoke('list-configs'),

  // Filling (dry-run or real)
  startFilling: (payload: { plan: any; execution: any; dryRun: boolean }) =>
    ipcRenderer.invoke('start-filling', payload),

  // Screenshots
  openScreenshot: (filePath: string) => ipcRenderer.invoke('open-screenshot', filePath),

  // Progress events
  onFillingProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('filling-progress', (_event, progress) => callback(progress));
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

declare global {
  interface Window {
    electronAPI: {
      scanForm: (formUrl: string) => Promise<any>;
      buildPlan: (scanResult: any) => Promise<any>;
      validatePlan: (plan: any) => Promise<{ valid: boolean; issues: any[] }>;
      exportPlan: (plan: any) => Promise<string | null>;
      importPlan: () => Promise<{ plan: any; validation: any } | null>;
      saveConfig: (name: string, plan: any, execution: any) => Promise<string>;
      loadConfig: (name: string) => Promise<any>;
      listConfigs: () => Promise<string[]>;
      startFilling: (payload: { plan: any; execution: any; dryRun: boolean }) => Promise<any>;
      openScreenshot: (filePath: string) => Promise<void>;
      onFillingProgress: (callback: (progress: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
