import { https } from 'firebase-functions/v2';
import { assertIsActive, catchErrors } from '../../utils/functionHelpers';
import { checkServerStatus, startServer, stopServer } from './utils';
import { database } from '../../configs/database';

const skipNextAutoShutdown = async () => {
  await database.collection('status').doc('ag-server').set(
    {
      skipNextAutoShutdown: true,
    },
    { merge: true },
  );
};

const handleVM = (type: string) => {
  switch (type) {
    case 'start':
      return startServer();
    case 'stop':
      return stopServer();
    case 'check':
      return checkServerStatus();
    case 'delay':
      return skipNextAutoShutdown();
    default:
      throw new https.HttpsError(
        'invalid-argument',
        `function called without type     
        data`,
      );
  }
};

export default async (request: https.CallableRequest): Promise<void> => {
  assertIsActive(request);

  return catchErrors(handleVM(request.data.type));
};
