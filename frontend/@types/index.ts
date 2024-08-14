export * from './api';
export * from './common';
export * from './vue';

export type BackupData = {
  name: string;
  getDownloadURL: () => Promise<string>;
};
