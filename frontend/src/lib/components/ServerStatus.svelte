<script lang="ts">
// frontend/src/lib/components/ServerStatus.svelte
import { status as serverStatus } from '$lib/client/services/firestore.svelte';
import { hasMap, ipAddress, mapHref } from '$lib/constants';
import { toCalendar } from '$lib/utils/date';
import PlayersDialog from './PlayersDialog.svelte';

let {
  onCheck = () => {},
  onDelay = (_s: boolean) => {},
  loadingCheck = false
} = $props();

let showCopyTooltip = $state(false);
let showPlayers = $state(false);

const data = $derived(serverStatus.value);
const serverIsOn = $derived(serverStatus.serverIsOn);
const serverStat = $derived(data?.serverStatus ?? 'UNKNOWN');
const skipNextAutoShutdown = $derived(data?.skipNextAutoShutdown ?? false);
const lastChecked = $derived(data?.updatedAt ? toCalendar(data.updatedAt) : undefined);
const lastOnline = $derived(data?.lastOnline ? toCalendar(data.lastOnline) : undefined);

function getNextShutdownTime(): string {
  const now = new Date();
  const hours = now.getHours();
  // Scheduler runs every 6 hours in Europe/Oslo timezone
  // Use local time (browser converts from UTC)
  const next = Math.ceil((hours + 1) / 6) * 6;
  const nextHour = next <= 23 ? next : 0;
  const timeStr = nextHour.toString().padStart(2, '0') + ':00';
  const isTomorrow = next > 23;
  return isTomorrow ? `tomorrow ${timeStr}` : timeStr;
}

async function copyIP() {
  try {
    await navigator.clipboard.writeText(ipAddress);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = ipAddress;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  showCopyTooltip = true;
  setTimeout(() => (showCopyTooltip = false), 2000);
}
</script>

<div class="card bg-base-100 shadow-sm border border-base-200">
    <div class="card-body p-4 space-y-4">

        <div class="flex justify-between items-center">
            <h2 class="card-title text-sm opacity-60 uppercase tracking-wider">Server Status</h2>
            <button onclick={() => onCheck()} disabled={loadingCheck} class="btn btn-ghost btn-xs">
                {#if loadingCheck}
                    <span class="loading loading-spinner loading-xs"></span>
                {:else}
                    🔄 Refresh
                {/if}
            </button>
        </div>

        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        {#if data}
            {#if serverIsOn}
                <div class="alert alert-success shadow-sm">
                    <div class="inline-grid *:[grid-area:1/1]">
                        <div class="status status-success animate-ping"></div>
                        <div class="status status-success"></div>
                    </div>
                    <span>Server is up — <strong>{serverStat}</strong></span>
                </div>
            {:else}
                <div class="alert alert-error shadow-sm">
                    <div class="inline-grid *:[grid-area:1/1]">
                        <div class="status status-error"></div>
                    </div>
                    <span>Server is down — <strong>{serverStat}</strong></span>
                </div>
            {/if}
        {:else}
            <div class="flex justify-center py-4">
                <span class="loading loading-spinner loading-md"></span>
            </div>
        {/if}

        {#if data}
            <div class="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                {#if lastChecked}
                    <div class="flex flex-col">
                        <span class="opacity-50">Last checked</span>
                        <span class="font-medium">{lastChecked}</span>
                    </div>
                {/if}
                {#if serverIsOn}
                    <div class="flex flex-col gap-1.5">
                        <div class="flex items-center gap-2">
                            <span class="opacity-50">Auto shutdown</span>
                            {#if skipNextAutoShutdown}
                                <button onclick={() => onDelay(false)} class="btn btn-error btn-outline btn-xs gap-1">
                                    ❌ Cancel Delay
                                </button>
                            {:else}
                                <button onclick={() => onDelay(true)} class="btn btn-ghost btn-xs gap-1 text-base-content/70">
                                    ⏳ Delay Next
                                </button>
                            {/if}
                        </div>
                        <span class="font-medium text-xs">
                            {#if skipNextAutoShutdown}
                                Skipping next shutdown
                            {:else}
                                Every 6 hours (next: {getNextShutdownTime()})
                            {/if}
                        </span>
                    </div>
                {/if}
                {#if !serverIsOn && lastOnline}
                    <div class="flex flex-col">
                        <span class="opacity-50">Last online</span>
                        <span class="font-medium">{lastOnline}</span>
                    </div>
                {/if}
            </div>
        {/if}

        <div class="grid grid-cols-2 gap-2 mt-2">
            <div class="relative w-full {serverIsOn ? '' : 'col-span-2'}">
                <button onclick={copyIP} class="btn btn-outline btn-sm w-full">
                    📋 Copy IP
                </button>
                {#if showCopyTooltip}
                    <span class="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-base-300 px-2 py-1 text-xs shadow z-10">Copied!</span>
                {/if}
            </div>

            {#if serverIsOn}
                <button onclick={() => (showPlayers = true)} class="btn btn-outline btn-sm w-full">
                    👥 Online
                </button>
            {/if}

            {#if hasMap && mapHref}
                <a href={mapHref} target="_blank" rel="noopener noreferrer"
                   class="btn btn-info btn-sm w-full text-white {serverIsOn ? '' : 'btn-disabled'} col-span-2">
                    🗺️ View Live Map
                </a>
            {/if}
        </div>
    </div>
</div>

<PlayersDialog bind:open={showPlayers} />
