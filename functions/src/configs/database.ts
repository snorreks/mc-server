import app from './app';
import { getFirestore } from 'firebase-admin/firestore';

export const database = getFirestore(app);
