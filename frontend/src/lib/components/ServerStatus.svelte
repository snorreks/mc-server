<script lang="ts">
// frontend/src/lib/components/ServerStatus.svelte
import { status as serverStatus } from '$lib/client/services/firestore.svelte';
import { hasMap, ipAddress, mapHref } from '$lib/constants';
import { toCalendar } from '$lib/utils/date';
import PlayersDialog from './PlayersDialog.svelte';

let { onCheck = () => {}, onDelay = (_s: boolean) => {}, loadingCheck = false } = $props();

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

<div class="card bg-base-100 border border-base-300 shadow-sm">
    <div class="card-body p-5 space-y-4">

        <div class="flex justify-between items-center">
            <h2 class="text-xs font-bold uppercase tracking-wider text-base-content/50">Server Status</h2>
            <button onclick={() => onCheck()} disabled={loadingCheck} class="btn btn-ghost btn-xs gap-1.5 font-medium">
                {#if loadingCheck}
                    <span class="loading loading-spinner loading-xs"></span>
                {:else}
                    🔄 Refresh
                {/if}
            </button>
        </div>

        {#if data}
            {#if serverIsOn && serverStat === 'STARTING'}
                <div class="alert alert-warning items-center gap-3 rounded-xl bg-warning text-warning-content font-medium text-sm shadow-xs">
                    <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                    </span>
                    <span>Starting up… loading mods (<span class="font-mono font-bold text-xs">{serverStat}</span>)</span>
                </div>
            {:else if serverIsOn}
                <div class="alert alert-success items-center gap-3 rounded-xl bg-success text-success-content font-medium text-sm shadow-xs">
                    <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                    </span>
                    <span>Server is up — <span class="font-mono font-bold text-xs">{serverStat}</span></span>
                </div>
            {:else}
                <div class="alert alert-error items-center gap-3 rounded-xl bg-error text-error-content font-medium text-sm shadow-xs">
                    <span class="relative flex h-2 w-2">
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                    </span>
                    <span>Server is down — <span class="font-mono font-bold text-xs">{serverStat}</span></span>
                </div>
            {/if}
        {:else}
            <div class="flex justify-center py-4">
                <span class="loading loading-spinner loading-md text-primary"></span>
            </div>
        {/if}

        {#if data}
            <div class="grid grid-cols-2 gap-4 border-t border-b border-base-200 py-3 text-xs">
                {#if lastChecked}
                    <div class="flex flex-col gap-0.5">
                        <span class="text-base-content/40 font-medium">Last checked</span>
                        <span class="font-semibold text-base-content/80">{lastChecked}</span>
                    </div>
                {/if}

                {#if serverIsOn}
                    <div class="flex flex-col gap-0.5">
                        <div class="flex items-center gap-1.5">
                            <span class="text-base-content/40 font-medium">Auto shutdown</span>
                            {#if skipNextAutoShutdown}
                                <button onclick={() => onDelay(false)} class="badge badge-error gap-1 text-[10px] font-bold cursor-pointer hover:opacity-80 transition-opacity">
                                    ❌ Cancel Delay
                                </button>
                            {:else}
                                <button onclick={() => onDelay(true)} class="badge badge-ghost border-base-300 gap-1 text-[10px] font-medium cursor-pointer hover:bg-base-200 transition-colors">
                                    ⏳ Delay Next
                                </button>
                            {/if}
                        </div>
                        <span class="font-semibold text-base-content/80">
                            {#if skipNextAutoShutdown}
                                Skipping next shutdown
                            {:else}
                                Every 6 hours ({getNextShutdownTime()})
                            {/if}
                        </span>
                    </div>
                {/if}

                {#if !serverIsOn && lastOnline}
                    <div class="flex flex-col gap-0.5">
                        <span class="text-base-content/40 font-medium">Last online</span>
                        <span class="font-semibold text-base-content/80">{lastOnline}</span>
                    </div>
                {/if}
            </div>
        {/if}

        <div class="flex flex-col sm:flex-row gap-2 pt-1">
            <div class="relative flex-1">
                <button onclick={copyIP} class="btn btn-neutral btn-sm w-full gap-1.5 font-medium">
                    📋 Copy IP
                </button>
                {#if showCopyTooltip}
                    <span class="absolute -top-9 left-1/2 -translate-x-1/2 rounded-md bg-neutral text-neutral-content px-2.5 py-1 text-xs font-medium shadow-md z-10 animate-fade-in">Copied!</span>
                {/if}
            </div>

            {#if serverIsOn}
                <button onclick={() => (showPlayers = true)} class="btn btn-outline btn-sm flex-1 gap-1.5 font-medium">
                    👥 Online Players
                </button>
            {/if}

            {#if hasMap && mapHref}
                <a href={mapHref} target="_blank" rel="noopener noreferrer"
                   class="btn btn-info btn-sm text-white font-medium sm:col-span-2 {serverIsOn ? '' : 'btn-disabled'}">
                    🗺️ Live Map ↗
                </a>
            {/if}
        </div>
    </div>
</div>

<PlayersDialog bind:open={showPlayers} />
