import { https } from 'firebase-functions';

/**
Validates auth context for callable function 
*/
export const assertIsActive = (context: https.CallableContext): void => {
  if (!context.auth?.token.isActive) {
    throw new https.HttpsError('permission-denied', 'You are not an AG Boie');
  }
};

/**
Validates data payload of a callable function
*/
export const assert = (data: unknown, key: string): unknown => {
  if (!data || !(data as Record<string, unknown>)[key]) {
    throw new https.HttpsError(
      'invalid-argument',
      `function called without ${key} data`
    );
  } else {
    return (data as Record<string, unknown>)[key];
  }
};

/**
Sends a descriptive error response when running a callable function
*/
export const catchErrors = async <T>(promise: Promise<T> | T): Promise<T> => {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof https.HttpsError) {
      throw e;
    } else {
      throw new https.HttpsError('unknown', e);
    }
  }
};
