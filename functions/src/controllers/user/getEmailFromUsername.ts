import { db } from '../../configs/dbConfig';
import { assert, catchErrors } from '../../utils/functionHelpers';

/**
Check if username exists
*/
export const getEmailFromUsername = async (
  username: string
): Promise<string | undefined> => {
  const result = await db
    .collection('users')
    .where('username', '==', username)
    .limit(1)
    .get();
  return result.empty ? undefined : result.docs[0].data().email;
};

export default async (data: unknown): Promise<string | undefined> => {
  const username = assert(data, 'username') as string;
  return catchErrors(getEmailFromUsername(username));
};
