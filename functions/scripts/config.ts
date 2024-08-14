import functions from 'firebase-functions-test';
import { projectId } from '../../constant';
import {resolve} from "node:path"


const serviceAccountPath = resolve(__dirname, './service-account.json');

const fun = functions(
  {
    projectId,
    databaseURL: `https://${projectId}.firebaseio.com`,
    storageBucket: `${projectId}.appspot.com`,
  },
  serviceAccountPath,
);

export default fun;
