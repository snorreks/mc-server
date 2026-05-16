import { json } from '@sveltejs/kit';
import { getBillingInfo } from '$lib/server/billing';
import { logger } from '$logger';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const info = await getBillingInfo();
  logger.info('billing', 'served', info);
  return json(info);
};
