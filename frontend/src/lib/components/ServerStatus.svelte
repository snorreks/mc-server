<script lang="ts">
    // frontend/src/lib/components/ServerStatus.svelte
    import { status as serverStatus } from '$lib/client/services/firestore.svelte';
    import { hasMap, ipAddress, mapHref } from '$lib/constants';
    import { toCalendar } from '$lib/utils/date';
    import PlayersDialog from './PlayersDialog.svelte';

    let { noop = () => {} }: { noop?: () => void } = $props();

    let showCopyTooltip = $state(false);
    let showPlayers = $state(false);

    const data = $derived(serverStatus.value);
    const serverIsOn = $derived(serverStatus.serverIsOn);
    const serverStat = $derived(data?.serverStatus ?? 'UNKNOWN');
    const skipNextAutoShutdown = $derived(data?.skipNextAutoShutdown ?? false);
    const lastChecked = $derived(data?.updatedAt ? toCalendar(data.updatedAt) : undefined);
    const lastOnline = $derived(data?.lastOnline ? toCalendar(data.lastOnline) : undefined);

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
        setTimeout(() => (showCopyTooltip = false), 1000);
        noop();
    }
</script>

<div class="card bg-base-100 shadow-sm border border-base-200">
    <div class="card-body p-4 space-y-3">
        <!-- Status alert -->
        {#if data}
            {#if serverIsOn}
                <div class="alert alert-success">
                    <div class="inline-grid *:[grid-area:1/1]">
                        <div class="status status-success animate-ping"></div>
                        <div class="status status-success"></div>
                    </div>
                    <span>Server is up — <strong>{serverStat}</strong></span>
                </div>
            {:else}
                <div class="alert alert-error">
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

        <!-- Stats row -->
        {#if data}
            <div class="stats stats-horizontal shadow w-full overflow-x-auto">
                {#if lastChecked}
                    <div class="stat p-3 flex-1 min-w-0">
                        <div class="stat-title text-xs">Last checked</div>
                        <div class="stat-value text-xs sm:text-sm truncate">{lastChecked}</div>
                    </div>
                {/if}
                {#if serverIsOn}
                    <div class="stat p-3 flex-1 min-w-0">
                        <div class="stat-title text-xs">Auto shutdown</div>
                        <div class="stat-value text-xs sm:text-sm">
                            {skipNextAutoShutdown ? 'Skipped ✓' : '6:00 AM'}
                        </div>
                    </div>
                {/if}
                {#if !serverIsOn && lastOnline}
                    <div class="stat p-3 flex-1 min-w-0">
                        <div class="stat-title text-xs">Last online</div>
                        <div class="stat-value text-xs sm:text-sm truncate">{lastOnline}</div>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Players button -->
        {#if serverIsOn}
            <button onclick={() => (showPlayers = true)} class="btn btn-ghost btn-sm w-full justify-start gap-2">
                <div class="avatar-group -space-x-3">
                    <div class="avatar">
                        <div class="w-6 rounded-full bg-primary text-primary-content text-xs font-bold flex items-center justify-center">?</div>
                    </div>
                </div>
                <span>Who's online?</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-auto opacity-50" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                </svg>
            </button>
        {/if}

        <div class="divider my-1"></div>

        <!-- Copy IP -->
        <div class="relative">
            <button onclick={copyIP} class="btn btn-outline w-full justify-start text-sm">
                📋 Copy IP: {ipAddress}
            </button>
            {#if showCopyTooltip}
                <span class="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-base-300 px-2 py-1 text-xs shadow">Copied!</span>
            {/if}
        </div>

        <!-- Map -->
        {#if hasMap && mapHref}
            <a href={mapHref} target="_blank" rel="noopener noreferrer"
                class="btn btn-info btn-sm w-full" class:btn-disabled={!serverIsOn}>
                🗺️ View map
            </a>
        {/if}
    </div>
</div>

<PlayersDialog bind:open={showPlayers} />
