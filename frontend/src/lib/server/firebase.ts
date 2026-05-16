import {
  type AppOptions,
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from 'firebase-admin/app';
import { PROJECT_ID } from '$config';
import { FIREBASE_SERVICE_ACCOUNT } from '$env/static/private';

/**
 * Parses the Firebase service account JSON string and fixes private key newlines.
 */
export const parseServiceAccount = (serviceAccountString: string): ServiceAccount => {
  try {
    // 1. Decode Base64 if necessary
    let jsonString = serviceAccountString;
    if (!serviceAccountString.trim().startsWith('{')) {
      jsonString = Buffer.from(serviceAccountString, 'base64').toString('utf-8');
    }

    // 2. THE FIX: Convert literal line breaks back into escaped \n text
    // This prevents the "Unterminated string in JSON" error
    jsonString = jsonString.replace(/\r?\n/g, '\\n');
    // 3. Now it is safe to parse
    const parsed = JSON.parse(jsonString) as ServiceAccount;

    // 4. Firebase Admin SDK actually *needs* literal newlines in the private key,
    // so we convert them back after parsing the JSON object.
    if (parsed.privateKey) {
      parsed.privateKey = parsed.privateKey.replace(/\\n/g, '\n');
    }

    return parsed;
  } catch (error) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT env:', serviceAccountString);
    throw error;
  }
};

/**
 * Builds the configuration options for the Firebase Admin SDK based on the environment.
 */
const buildAppOptions = (): AppOptions => {
  const options: AppOptions = {};

  const isRunningOnCloudRun = !!process.env.K_SERVICE;

  const serviceAccountString = isRunningOnCloudRun ? undefined : FIREBASE_SERVICE_ACCOUNT;
  console.info('isRunningOnCloudRun', isRunningOnCloudRun);

  // 🚨 THE FIX: Strip leaked GitHub Actions paths so they don't hijack native ADC
  if (
    isRunningOnCloudRun &&
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.includes('/home/runner/')
  ) {
    console.warn('Detected leaked CI credential path. Deleting it to force native Cloud Run ADC.');
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  if (serviceAccountString) {
    console.info('- Initializing Firebase Admin SDK with service account');
    options.credential = cert(parseServiceAccount(serviceAccountString));
  } else {
    console.info('- Initializing Firebase Admin SDK without service account (relying on ADC)');
  }

  options.storageBucket = `${PROJECT_ID}.firebasestorage.app`;
  options.projectId = PROJECT_ID;

  return options;
};

/**
 * Retrieves an existing Firebase Admin app or initializes a new one.
 */
export const getApp = () => {
  const existingApp = getApps()[0];
  // Early return if we already have a valid app instance
  if (existingApp) {
    return existingApp;
  }

  const options = buildAppOptions();

  console.debug(`- Initializing Firebase Admin SDK with options`, {
    ...options,
    credential: !!options.credential,
  });

  const initializedApp = initializeApp(options);

  console.debug('- Firebase Admin SDK initialized!');

  return initializedApp;
};
