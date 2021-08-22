import type { Timestamp, FieldValue } from './api';
export interface UserForm {
  email: string;
  username?: string;
  displayName?: string;
  password: string;
}

export interface UserData {
  id: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  displayName?: string;
  email: string;
  username?: string;
}

export interface UserCreateData
  extends Omit<UserData, 'id' | 'createdAt' | 'updatedAt' | 'videosAmount'> {
  createdAt: FieldValue;
}
