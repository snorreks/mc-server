import { https } from 'firebase-functions/v2';
import { database } from '../../configs/database';
import { assert, catchErrors } from '../../utils/functionHelpers';

/**
Check if username exists
*/
export const getEmailFromUsername = async (
  username: string,
): Promise<string | undefined> => {
  const result = await database
    .collection('users')
    .where('username', '==', username)
    .limit(1)
    .get();
  return result.empty ? undefined : result.docs[0]?.data()?.['email'];
};

export default async (
  request: https.CallableRequest,
): Promise<string | undefined> => {
  const username = assert(request.data, 'username') as string;

  return catchErrors(getEmailFromUsername(username));
};
