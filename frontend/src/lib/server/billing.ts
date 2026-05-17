// frontend/src/lib/server/billing.ts
// GCP cost estimation for the Minecraft server VM.
// We calculate directly from the VM specs + tracked runtime instead of
// relying on the Budgets API (which returns 0 due to free trial credits).

import { GCP_FREE_TIER_DAYS } from '$config';
import { logger } from '$logger';
import type { ServerStatusData } from '$config';

export type BillingInfo = {
  spent: number;
  limit: number;
  days: number;
  /** Human-readable label, e.g. "Free Trial" */
  label?: string;
  /** Currency code */
  currency?: string;
  /** Free trial end date (ISO string) */
  endDate?: string;
};

// ── Cost constants (europe-west1, n2-highmem-4) ──────────────────────────────
// Updated manually if specs change.
//   n2-highmem-4 (4 vCPU, 32GB): ~$0.65/hr
//   20GB pd-ssd boot disk:         $3.40/mo
//   50GB pd-ssd data disk:         $8.50/mo
//   Static external IP (in-use):   $2.88/mo  (~$0.004/hr)
const HOURLY_VM_RATE_USD = 0.65;
const HOURLY_IP_RATE_USD = 0.004;
const HOURLY_DISK_RATE_USD = (3.40 + 8.50) / 720; // per hour
const HOURLY_TOTAL = HOURLY_VM_RATE_USD + HOURLY_IP_RATE_USD + HOURLY_DISK_RATE_USD;
const FREE_TRIAL_LIMIT_USD = 300;

// ── Cost calculation from Firestore runtime ──────────────────────────────────

/** Safely get milliseconds from Date or Firestore Timestamp */
function toMs(d: Date | { toMillis?: () => number } | undefined | null): number {
  if (!d) return 0;
  if (typeof (d as Date).getTime === 'function') return (d as Date).getTime();
  if (typeof (d as { toMillis: () => number }).toMillis === 'function') return (d as { toMillis: () => number }).toMillis();
  return 0;
}

function getEstimatedCost(status: ServerStatusData | undefined): BillingInfo {
  const serverIsOn = status?.serverIsOn ?? false;

  // Calculate remaining free trial days from createdAt
  const createdAt = status?.createdAt;
  const createdAtMs = toMs(createdAt);
  const daysLeft = createdAtMs > 0
    ? Math.max(0, GCP_FREE_TIER_DAYS - Math.floor((Date.now() - createdAtMs) / 86400000))
    : GCP_FREE_TIER_DAYS;

  // Total runtime = accumulated (from stopped sessions) + current session
  const totalRuntimeMs = status?.totalRuntimeMs ?? 0;
  let currentSessionMs = 0;

  if (serverIsOn && status?.startedAt) {
    const startedAtMs = toMs(status.startedAt);
    if (startedAtMs > 0) currentSessionMs = Date.now() - startedAtMs;
  }

  const totalHours = (totalRuntimeMs + currentSessionMs) / 3600000;

  // Current month's runtime (could be from multiple sessions)
  // Since we track all runtime, this is lifetime. Estimate monthly from 30 days.
  const cost = totalHours * HOURLY_TOTAL;
  const spent = Math.round(cost * 100) / 100;

  logger.info('billing', 'estimated cost', {
    totalHours: totalHours.toFixed(1),
    currentSession: (currentSessionMs / 3600000).toFixed(1),
    hourlyRate: HOURLY_TOTAL.toFixed(3),
    spent: spent.toFixed(2),
    limit: FREE_TRIAL_LIMIT_USD,
  });

  // Calculate end date
  const endDate = createdAtMs > 0
    ? new Date(createdAtMs + GCP_FREE_TIER_DAYS * 86400000).toISOString().split('T')[0]
    : undefined;

  return {
    spent,
    limit: FREE_TRIAL_LIMIT_USD,
    days: daysLeft,
    label: 'Free Trial (estimated)',
    currency: 'NOK',
    endDate,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getBillingInfo(status: ServerStatusData | undefined): BillingInfo {
  try {
    return getEstimatedCost(status);
  } catch (e) {
    logger.error('billing', 'cost estimation failed', e);
    return {
      spent: 0,
      limit: FREE_TRIAL_LIMIT_USD,
      days: GCP_FREE_TIER_DAYS,
      currency: 'USD',
    };
  }
}
