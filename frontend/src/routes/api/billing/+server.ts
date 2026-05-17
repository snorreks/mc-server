import { json } from '@sveltejs/kit';
import { getBillingInfo } from '$lib/server/billing';
import { getServerStatus } from '$lib/server/firestore';
import { logger } from '$logger';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const status = await getServerStatus();
  const info = getBillingInfo(status);
  logger.info('billing', 'served', info);
  return json(info);
};
