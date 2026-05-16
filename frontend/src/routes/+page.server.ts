import { getBillingInfo } from '$lib/server/billing';
import { getServerStatus } from '$lib/server/firestore';
import { getServerInfo } from '$lib/server/server-info';
import { toJsonData } from '$lib/server/transform';
import { logger } from '$logger';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const start = Date.now();

  const [[status, sTime], [billing, bTime], [serverInfo, iTime]] = await Promise.all([
    time('getServerStatus', getServerStatus()),
    time('getBillingInfo', getBillingInfo()),
    time('getServerInfo', getServerInfo()),
  ]);

  logger.info('page', `load complete (${Date.now() - start}ms)`, {
    serverStatus: sTime,
    billing: bTime,
    serverInfo: iTime,
  });

  return {
    status: status && toJsonData(status),
    billing,
    serverInfo,
  };
};

async function time<T>(label: string, promise: Promise<T>): Promise<[T, number]> {
  const start = Date.now();
  try {
    const result = await promise;
    const ms = Date.now() - start;
    logger.info('page', `${label}:`, result);
    return [result, ms];
  } catch (e) {
    const ms = Date.now() - start;
    logger.error('page', `${label}: ❌ (${ms}ms)`, e);
    throw e;
  }
}
