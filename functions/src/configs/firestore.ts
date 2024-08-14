import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const serverTimestamp = FieldValue.serverTimestamp;
export const serverIncrement = FieldValue.increment;
export const serverDelete = FieldValue.delete;
export const timestampFromDate = Timestamp.fromDate;
