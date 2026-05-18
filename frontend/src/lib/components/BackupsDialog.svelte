<script lang="ts">
    // frontend/src/lib/components/BackupsDialog.svelte
import { listBackups } from '$lib/client/services/storage.svelte';
import type { BackupData } from '$lib/types';

let { open = $bindable(false) }: { open?: boolean } = $props();

let dialogEl = $state<HTMLDialogElement>();
let backups: BackupData[] = $state([]);
let loading = $state(false);
let error = $state('');

// Backup trigger state
let backupState = $state<'idle' | 'running' | 'completed' | 'failed'>('idle');
let backupError = $state('');

$effect(() => {
  if (open && dialogEl) {
    loadBackups();
    dialogEl.showModal();
  }
});

function onDialogClose() {
  open = false;
}

async function loadBackups() {
  loading = true;
  error = '';
  try {
    backups = await listBackups();
  } catch (e) {
    error = 'Failed to load backups';
  } finally {
    loading = false;
  }
}

async function triggerBackup() {
  backupState = 'running';
  backupError = '';
  try {
    const res = await fetch('/api/vm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'backup' }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Backup failed');
    }
    backupState = 'completed';
    // Refresh the backups list after a short delay
    setTimeout(() => loadBackups(), 1000);
  } catch (e) {
    backupState = 'failed';
    backupError = e instanceof Error ? e.message : 'Backup failed';
  }
}

async function downloadBackup(backup: BackupData) {
  const url = await backup.getDownloadURL();
  const a = document.createElement('a');
  a.href = url;
  a.download = backup.name;
  a.click();
}

function parseBackupDate(filename: string): Date {
  const name = filename.replace('.tar.gz', '');
  const [datePart, timePart] = name.split('_');
  if (!datePart || !timePart) return new Date(0);
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

const sortedBackups = $derived(
  [...backups]
    .map((b) => ({
      ...b,
      displayName: b.name.replace('.tar.gz', ''),
      date: parseBackupDate(b.name),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime()),
);

function close() {
  open = false;
}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<dialog bind:this={dialogEl} class="modal" onclose={onDialogClose}>
  <div class="modal-box">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-bold">Backups</h3>
      <form method="dialog">
        <button class="btn btn-circle btn-ghost btn-sm">✕</button>
      </form>
    </div>

    <!-- Backup Trigger Button -->
    <div class="mb-4">
      {#if backupState === 'idle' || backupState === 'failed'}
        <button onclick={triggerBackup} disabled={loading} class="btn btn-primary w-full gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Start Backup Now
        </button>
        {#if backupState === 'failed'}
          <p class="text-xs text-error mt-1">{backupError}</p>
        {/if}
      {:else if backupState === 'running'}
        <button disabled class="btn btn-primary w-full gap-2">
          <span class="loading loading-spinner loading-sm"></span>
          Running backup…
        </button>
        <p class="text-xs text-base-content/60 mt-1 text-center">Saving world, uploading to cloud storage</p>
      {:else if backupState === 'completed'}
        <div class="alert alert-success flex items-center gap-2 py-2">
          <span>✅ Backup completed!</span>
          <button onclick={() => (backupState = 'idle')} class="btn btn-ghost btn-xs ml-auto">Dismiss</button>
        </div>
      {/if}
    </div>

    <div class="divider my-2 text-xs text-base-content/40">Previous Backups</div>

    {#if loading}
      <div class="flex justify-center py-4">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    {:else if error}
      <div class="alert alert-error">
        <span>{error}</span>
        <button onclick={loadBackups} class="btn btn-sm">Retry</button>
      </div>
    {:else if sortedBackups.length === 0}
      <p class="py-4 text-center text-base-content/60">No backups found</p>
    {:else}
      <div class="max-h-64 overflow-y-auto">
        {#each sortedBackups as backup}
          <button
            onclick={() => downloadBackup(backup)}
            class="btn btn-ghost w-full justify-between"
          >
            <span class="text-sm">📁 {backup.displayName}</span>
            <span class="text-xs text-base-content/60">⬇ Download</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
