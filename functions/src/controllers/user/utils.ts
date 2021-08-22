import { UserCreateData } from '../../../@types';
import { db } from '../../configs/dbConfig';

/**
  Set the user document 
  */
export const setUserData = async (
  uid: string,
  userData: UserCreateData
): Promise<void> => {
  await db.collection('users').doc(uid).set(userData);
};
