export type ImageQuality = 'low' | 'medium' | 'high' | 'ultra';

export type CurrentUserStatus = 'active' | 'notActive' | 'notSignedIn';

export type AppNotification = {
  text: string;
  open: boolean;
  color: string;
  wildcards?: { [key: string]: string };
};

export type AppFab = {
  text: string;
  color: string;
  icon: string;
  to: string;
};

export interface TextValue {
  text: string;
  value: string | null;
  align?: string;
  sortable?: boolean;
}

export interface StatItem {
  name: string;
  amount: number;
}
