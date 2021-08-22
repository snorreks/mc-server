import { https } from 'firebase-functions';
import { assertIsActive, catchErrors } from '../../utils/functionHelpers';
import { startServer } from './utils';

export default async (
  _data: unknown,
  context: https.CallableContext
): Promise<void> => {
  assertIsActive(context);
  return catchErrors(startServer());
};
