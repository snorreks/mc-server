import { https } from 'firebase-functions';
import { auth } from '../../configs/authConfig';
import {
  assert,
  assertIsActive,
  catchErrors,
} from '../../utils/functionHelpers';
import { serverTimestamp } from '../../configs/firestoreConfig';
import { setUserData } from './utils';
import type { UserCreateData, UserForm } from '../../../@types';
import { getEmailFromUsername } from './getEmailFromUsername';
export interface AuthCreateRequest {
  email: string;
  displayName?: string;
  password?: string;
}

/**
Create an user in firebase and firestore
*/
export const createUser = async ({
  userForm: { email, username, displayName, password },
}: {
  userForm: UserForm;
}): Promise<string> => {
  let uid;
  try {
    const createRequest: AuthCreateRequest = {
      email,
      password,
    };
    if (displayName) createRequest.displayName = displayName;
    const userRecord = await auth.createUser(createRequest);

    uid = userRecord.uid;
    const userData: UserCreateData = {
      email,
      createdAt: serverTimestamp(),
    };
    if (username) {
      const usernameExists = !!(await getEmailFromUsername(username));
      if (usernameExists) {
        throw Error('username_taken');
      }
      userData.username = username;
    }
    if (displayName) userData.displayName = displayName;
    await auth.setCustomUserClaims(uid, { isActive: true });

    await setUserData(uid, userData);
    return uid;
  } catch (e) {
    if (uid) await auth.deleteUser(uid);
    throw e;
  }
};

export default async (
  data: unknown,
  context: https.CallableContext
): Promise<string> => {
  assertIsActive(context);
  const userForm = assert(data, 'userForm') as UserForm;
  return catchErrors(
    createUser({
      userForm,
    })
  );
};
