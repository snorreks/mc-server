import functions from 'firebase-functions-test';

const serviceAccountPath = '../service-account.json';

const projectId = 'mc-ag-server';

const fun = functions(
  {
    projectId,
    databaseURL: `https://${projectId}.firebaseio.com`,
    storageBucket: `${projectId}.appspot.com`,
  },
  serviceAccountPath
);

export default fun;
