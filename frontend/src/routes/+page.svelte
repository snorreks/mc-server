<script lang="ts">
    // frontend/src/routes/+page.svelte
    import { authStore } from '$lib/client/services/auth.svelte';
    import { status as serverStatus, seedFromSSR, init } from '$lib/client/services/firestore.svelte';
    import BackupsDialog from '$lib/components/BackupsDialog.svelte';
    import ModpackDialog from '$lib/components/ModpackDialog.svelte';
    import { onMount } from 'svelte';
    import ServerStatus from '$lib/components/ServerStatus.svelte';
    import VideoDialog from '$lib/components/VideoDialog.svelte';
    import VMControls from '$lib/components/VMControls.svelte';
    import type { PageProps } from './$types';
    import { GCP_FREE_TIER_CREDITS } from '$config';

    let { data }: PageProps = $props();

    let showVideoDialog = $state(false);
    let showBackupsDialog = $state(false);
    let showModpackDownload = $state(false);
    let loading = $state(false);

    const billing = $state(data.billing);
    const serverInfo = $state(data.serverInfo);
    seedFromSSR(data.status);

    onMount(() => {
        init();
    });

    function spinTheWheel() {
        if (Math.random() < 0.5) showVideoDialog = true;
    }

    async function vmAction(type: string) {
        spinTheWheel();
        loading = true;
        try {
            await fetch('/api/vm', {
                method: 'POST',
                body: JSON.stringify({ type }),
            });
        } catch (e) {
            console.error(type, e);
        } finally {
            loading = false;
        }
    }
</script>

<div class="space-y-6">

    <ServerStatus noop={spinTheWheel} />

    {#if serverInfo && !('error' in serverInfo)}
        <div class="stats stats-vertical sm:stats-horizontal shadow-sm w-full border border-base-200">
            <div class="stat px-4 py-3">
                <div class="stat-title text-xs font-semibold">Difficulty</div>
                <div class="stat-value text-lg capitalize">{serverInfo.difficulty}</div>
            </div>
            <div class="stat px-4 py-3">
                <div class="stat-title text-xs font-semibold">View Dist</div>
                <div class="stat-value text-lg">{serverInfo.viewDistance}</div>
            </div>
            <div class="stat px-4 py-3">
                <div class="stat-title text-xs font-semibold">Players</div>
                <div class="stat-value text-lg">{serverInfo.online} / {serverInfo.max}</div>
            </div>
        </div>
    {/if}

    {#if billing}
        <div class="card bg-base-100 shadow-sm border border-base-200">
            <div class="card-body p-4 space-y-4">
                {#if billing.label}
                    <h2 class="card-title text-sm opacity-60 uppercase tracking-wider">{billing.label}</h2>
                {/if}
                <div>
                    <div class="flex justify-between text-xs font-medium mb-1">
                        <span>Monthly Spend</span>
                        <span class="text-base-content/70">${billing.spent.toFixed(2)} / ${billing.limit.toFixed(0)}</span>
                    </div>
                    <progress class="progress progress-warning w-full" value={billing.spent} max={billing.limit}></progress>
                </div>
                <div>
                    <div class="flex justify-between text-xs font-medium mb-1">
                        <span>Free Trial Credit</span>
                        <span class="text-base-content/70">${GCP_FREE_TIER_CREDITS} · {billing.days} days left</span>
                    </div>
                    <progress class="progress progress-info w-full" value={0} max={billing.days}></progress>
                </div>
            </div>
        </div>
    {/if}

    {#if $authStore.isActive}
        <VMControls
            {loading}
            serverIsOn={serverStatus.serverIsOn}
            onCheck={() => vmAction('check')}
            onStart={() => vmAction('start')}
            onStop={() => vmAction('stop')}
            onDelay={() => vmAction('delay')}
            onBackup={() => (showBackupsDialog = true)}
        />
    {/if}

    <button onclick={() => (showModpackDownload = true)} class="btn btn-primary w-full gap-2 shadow-lg hover:-translate-y-0.5 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Install Modpack
    </button>
</div>

<VideoDialog bind:open={showVideoDialog} />
<BackupsDialog bind:open={showBackupsDialog} />
<ModpackDialog bind:open={showModpackDownload} />
