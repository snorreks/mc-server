import functions from 'firebase-functions-test';

const serviceAccountPath = '../service-account.json';

const projectId = 'meingraf421';

const fun = functions(
  {
    projectId,
    databaseURL: `https://${projectId}.firebaseio.com`,
    storageBucket: `${projectId}.appspot.com`,
  },
  serviceAccountPath
);

export default fun;
