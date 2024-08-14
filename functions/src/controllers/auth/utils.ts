import type { UserCreateData } from '$types';
import { database } from '../../configs/database';

/**
  Set the user document 
  */
export const setUserData = async (
  uid: string,
  userData: UserCreateData,
): Promise<void> => {
  await database.collection('users').doc(uid).set(userData);
};
