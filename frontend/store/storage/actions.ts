import { actionTree } from 'typed-vuex';
import { BackupData } from '~/@types';

export default actionTree(
  { state: () => ({}) },
  {
    async listBackups(_): Promise<BackupData[]> {
      this.app.$accessor.setAppLoading(true);
      try {
        const storage = this.app.$fire.storage;
        const backupsList = await storage.ref('backup').listAll();
        const backups: BackupData[] = [];
        for (const item of backupsList.items) {
          backups.push({
            name: item.name,
            getDownloadURL: () => item.getDownloadURL(),
          });
        }
        this.app.$accessor.setAppLoading(false);
        return backups;
      } catch (e) {
        console.error('stopServer', e);
        this.app.$accessor.setAppLoading(false);
        this.app.$accessor.endWithError(e.message);
        return [];
      }
    },
  }
);
