import { stopServer } from '../vm/utils';
import { database } from '../../configs/database';

const checkIfShouldSkipAutoShutdown = async (): Promise<boolean> => {
  try {
    const doc = await database.collection('status').doc('ag-server').get();
    const shouldSkipAutoShutdown =
      doc.data()?.['skipNextAutoShutdown'] || false;

    try {
      await database.collection('status').doc('ag-server').set(
        {
          skipNextAutoShutdown: false,
        },
        { merge: true },
      );
    } catch (e) {
      console.error('checkIfShouldSkipAutoShutdown', e);
    }

    return shouldSkipAutoShutdown;
  } catch (e) {
    console.error('checkIfShouldSkipAutoShutdown', e);
    return false;
  }
};

const dailyScheduler = async (): Promise<void> => {
  const shouldSkipAutoShutdown = await checkIfShouldSkipAutoShutdown();
  if (shouldSkipAutoShutdown) {
    return;
  }

  await stopServer();
};

export default async (): Promise<void> => {
  return dailyScheduler();
};
