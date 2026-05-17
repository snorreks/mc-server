import { getDownloadURL, listAll, ref } from 'firebase/storage';
import { MC_MODPACK_DOWNLOAD_URL } from '$config';
import { getFirebaseStorage } from '$lib/client/firebase';
import type { BackupData } from '$lib/types';

export async function getModpackDownloadURL(): Promise<string> {
  return MC_MODPACK_DOWNLOAD_URL;
}

export async function listBackups(): Promise<BackupData[]> {
  const storage = getFirebaseStorage();
  const backupsRef = ref(storage, 'backup');
  const result = await listAll(backupsRef);

  return Promise.all(
    result.items.map(async (item) => ({
      name: item.name,
      getDownloadURL: () => getDownloadURL(item),
    })),
  );
}
