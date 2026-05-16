// frontend/src/lib/server/billing.ts
// Real GCP billing info from the Cloud Billing & Budgets APIs.

import { google } from 'googleapis';
import { GCP_FREE_TIER_CREDITS, GCP_FREE_TIER_DAYS, PROJECT_ID } from '$config';
import { FIREBASE_SERVICE_ACCOUNT } from '$env/static/private';
import { parseServiceAccount } from '$lib/server/firebase';
import { logger } from '$logger';

export type BillingInfo = {
  spent: number;
  limit: number;
  days: number;
  /** Human-readable label, e.g. "Free credits" or "Budget name" */
  label?: string;
};

// ── Auth ─────────────────────────────────────────────────────────────────────
// Same pattern as routes/api/vm/+server.ts

async function getAuthClient() {
  const scopes = ['https://www.googleapis.com/auth/cloud-platform'];

  if (process.env.K_SERVICE) {
    const auth = new google.auth.GoogleAuth({ scopes });
    return auth.getClient();
  }

  const sa = parseServiceAccount(FIREBASE_SERVICE_ACCOUNT) as Record<string, string | undefined>;
  return new google.auth.JWT({
    email: sa.client_email ?? '',
    key: sa.private_key ?? '',
    scopes,
  });
}

// ── Billing ──────────────────────────────────────────────────────────────────

export async function getBillingInfo(): Promise<BillingInfo> {
  const fallback: BillingInfo = {
    spent: 0,
    limit: GCP_FREE_TIER_CREDITS,
    days: GCP_FREE_TIER_DAYS,
  };

  try {
    const auth = await getAuthClient();

    // 1. Find the billing account linked to this project
    const cloudbilling = google.cloudbilling('v1');
    const projRes = await cloudbilling.projects.getBillingInfo({
      name: `projects/${PROJECT_ID}`,
      auth: auth as never,
    });

    const billingAccountName = projRes.data.billingAccountName;
    if (!billingAccountName) {
      logger.info('billing', 'no billing account linked');
      return fallback;
    }

    // 2. Look for budgets (spend vs amount data)
    const budgetRes = await google.billingbudgets('v1').billingAccounts.budgets.list({
      parent: billingAccountName,
      auth: auth as never,
    });

    const budgets = budgetRes.data.budgets;
    if (budgets && budgets.length > 0) {
      const budget = budgets[0];
      const budgetAmount = budget.amount?.specifiedAmount?.units
        ? Number(budget.amount.specifiedAmount.units)
        : GCP_FREE_TIER_CREDITS;

      logger.info('billing', 'budget found', {
        name: budget.displayName,
        amount: budgetAmount,
      });

      return {
        spent: 0, // real-time spend requires BigQuery billing export
        limit: budgetAmount,
        days: GCP_FREE_TIER_DAYS,
        label: budget.displayName ?? undefined,
      };
    }

    logger.info('billing', 'no budgets — showing free tier');
    return { ...fallback, label: 'No budget configured' };
  } catch (e) {
    logger.error('billing', 'API call failed', e);
    return fallback;
  }
}
