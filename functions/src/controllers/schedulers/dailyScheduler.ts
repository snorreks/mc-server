import { stopServer } from '../vm/utils';

const dailyScheduler = async (): Promise<void> => {
  await stopServer();
};

export default async (): Promise<void> => {
  return dailyScheduler();
};
