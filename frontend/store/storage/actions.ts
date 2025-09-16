import { actionTree } from 'typed-vuex';
import { BackupData } from '~/@types';

export default actionTree(
  { state: () => ({}) },
  {
    async listBackups(_): Promise<BackupData[]> {
      try {
        const storage = this.app.$fire.storage;
        console.log('listBackups', storage);
        const backupsList = await storage.ref('backup').listAll();
        console.log('backupsList', backupsList);
        const backups: BackupData[] = [];
        for (const item of backupsList.items) {
          backups.push({
            name: item.name,
            getDownloadURL: () => item.getDownloadURL(),
          });
        }
        return backups;
      } catch (e) {
        console.error('stopServer', e);
        this.app.$accessor.endWithError(e.message);
        return [];
      }
    },
  }
);
