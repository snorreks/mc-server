import { getDownloadURL, listAll, ref } from 'firebase/storage';
import { getFirebaseStorage } from '$lib/client/firebase';
import type { BackupData } from '$lib/types';

export async function getModpackDownloadURL(): Promise<string> {
  const storage = getFirebaseStorage();
  const modpackRef = ref(storage, 'modpack/beyond-depth-full.zip');
  return getDownloadURL(modpackRef);
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
