// Type definitions for Electron API
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

export {};
