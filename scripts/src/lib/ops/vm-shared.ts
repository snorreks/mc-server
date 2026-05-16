// scripts/src/lib/ops/vm-shared.ts
// Shared VM connection details.

import { PROJECT_ID, VM_INSTANCE, VM_ZONE } from '../deployment_config';

/** Common gcloud flags for targeting the MC server VM. */
export const VM_FLAGS = [`--project=${PROJECT_ID}`, `--zone=${VM_ZONE}`];

/** The full gcloud compute resource path. */
export const VM_RESOURCE = `projects/${PROJECT_ID}/zones/${VM_ZONE}/instances/${VM_INSTANCE}`;

/** The SSH host string used by gcloud. */
export const VM_SSH_HOST = `${VM_INSTANCE} --zone=${VM_ZONE} --project=${PROJECT_ID}`;
