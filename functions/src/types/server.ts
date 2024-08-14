import type { FieldValue, Timestamp } from './api';

export interface ServerStatusData {
  serverIsOn: boolean;
  lastOnline?: Timestamp;
  updatedAt?: Timestamp;
  serverStatus?: string;
}

export interface ServerStatusUpdateData
  extends Omit<ServerStatusData, 'updatedAt' | 'lastOnline'> {
  updatedAt?: FieldValue;
  lastOnline?: FieldValue;
}
