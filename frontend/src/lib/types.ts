export interface BackupData {
  name: string;
  getDownloadURL: () => Promise<string>;
}

export type CurrentUserStatus = 'notSignedIn' | 'notActive' | 'active';
