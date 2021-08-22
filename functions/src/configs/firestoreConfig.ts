import admin from './adminConfig';

export const Firestore = admin.firestore;
export const serverTimestamp = Firestore.FieldValue.serverTimestamp;
export const serverIncrement = Firestore.FieldValue.increment;
export const serverDelete = Firestore.FieldValue.delete;
export const timestampFromDate = Firestore.Timestamp.fromDate;
