<script lang="ts">
// frontend/src/routes/+page.svelte
import { authStore } from '$lib/client/services/auth.svelte';
import { status as serverStatus, seedFromSSR, init } from '$lib/client/services/firestore.svelte';
import HealthDialog from '$lib/components/HealthDialog.svelte';
import BackupsDialog from '$lib/components/BackupsDialog.svelte';
import CommandConsole from '$lib/components/CommandConsole.svelte';
import ModpackDialog from '$lib/components/ModpackDialog.svelte';
import { onMount } from 'svelte';
import ServerStatus from '$lib/components/ServerStatus.svelte';
import VMControls from '$lib/components/VMControls.svelte';
import type { PageProps } from './$types';
import { PROJECT_ID, USD_TO_NOK_RATE, SUPER_ADMIN_EMAIL } from '$config';

let { data }: PageProps = $props();

let showBackupsDialog = $state(false);
let showCommandConsole = $state(false);
let showHealth = $state(false);
let showModpackDownload = $state(false);
let loading = $state(false);
import { get } from 'svelte/store';
let isAuthActive = $state(get(authStore).isActive);
let authEmail = $state(get(authStore).email);
authStore.subscribe(s => { isAuthActive = s.isActive; authEmail = s.email; });



const billing = $state(data.billing);
const serverInfo = $state(data.serverInfo);
const cfg = $derived(serverInfo && !('error' in serverInfo) ? serverInfo : null);
seedFromSSR(data.status);

onMount(() => {
  init();
});

async function vmAction(type: string, skip?: boolean) {
  loading = true;
  try {
    await fetch('/api/vm', {
      method: 'POST',
      body: JSON.stringify({ type, skip }),
    });
  } catch (e) {
    console.error(type, e);
  } finally {
    loading = false;
  }
}
</script>

<div class="space-y-6">

    <ServerStatus
        onCheck={() => vmAction('check')}
        onDelay={(skip: boolean) => vmAction('delay', skip)}
        loadingCheck={loading}
    />

    <div class="collapse collapse-arrow bg-base-100 shadow-sm border border-base-200">
        <input type="checkbox" name="server-details" autocomplete="off" />
        <div class="collapse-title text-sm font-semibold opacity-80">
            ⚙️ Server Details & Usage
        </div>
        <div class="collapse-content space-y-4">
            {#if cfg}
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span class="block opacity-50 text-xs">Difficulty</span>
                    <span class="font-medium capitalize">{cfg.difficulty}</span>
                </div>
                <div>
                    <span class="block opacity-50 text-xs">View Distance</span>
                    <span class="font-medium">{cfg.viewDistance} chunks</span>
                </div>
                <div>
                    <span class="block opacity-50 text-xs">Hardware</span>
                    <span class="font-medium">{cfg.memory} ({cfg.machineType})</span>
                </div>
                <div>
                    <span class="block opacity-50 text-xs">Modpack</span>
                    <a href={cfg.modpackUrl} target="_blank" rel="noopener noreferrer" class="link link-primary font-medium">{cfg.modpackName} ({cfg.version})</a>
                </div>
                <div class="col-span-2">
                    <span class="block opacity-50 text-xs">Engine</span>
                    <span class="font-medium">{cfg.type} {cfg.forgeVersion} (ZGC Optimized)</span>
                </div>
            </div>
            {/if}

            <div class="divider my-1"></div>

            {#if billing}
                <div class="text-xs space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="opacity-70">Estimated spend</span>
                        <span class="font-semibold">kr{(billing.spent * (cfg?.usdToNokRate ?? USD_TO_NOK_RATE)).toFixed(0)}</span>
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <span class="opacity-70">Free trial used</span>
                            <span class="font-semibold">kr{(billing.spent * (cfg?.usdToNokRate ?? USD_TO_NOK_RATE)).toFixed(0)} / kr{(billing.limit * (cfg?.usdToNokRate ?? USD_TO_NOK_RATE)).toFixed(0)}</span>
                        </div>
                        <progress class="progress progress-warning w-full h-2" value={billing.spent} max={billing.limit}></progress>
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <span class="opacity-70">Days remaining</span>
                            <span class="font-semibold">{billing.days} / 90</span>
                        </div>
                        <progress class="progress progress-info w-full h-2" value={billing.days} max={90}></progress>
                    </div>
                    {#if billing.endDate}
                        <div class="flex items-center justify-between">
                            <span class="opacity-70">Free trial ends</span>
                            <span class="font-semibold">{new Date(billing.endDate).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                    {/if}
                    <a href="https://console.cloud.google.com/billing/credits?project={PROJECT_ID}" target="_blank" rel="noopener noreferrer" class="link link-primary text-xs block">
                        📊 View actual trial in GCP Console ↗
                    </a>
                </div>
            {/if}
        </div>
    </div>

    <VMControls
        {loading}
        serverIsOn={serverStatus.serverIsOn}
        isActive={isAuthActive}
        isSuperAdmin={isAuthActive && authEmail === SUPER_ADMIN_EMAIL}
        onStart={() => vmAction('start')}
        onStop={() => vmAction('stop')}
        onBackup={() => (showBackupsDialog = true)}
        onCommand={() => (showCommandConsole = true)}
        onHealth={() => (showHealth = true)}
    />

    <button onclick={() => (showModpackDownload = true)} class="btn btn-primary w-full gap-2 shadow-lg hover:-translate-y-0.5 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Install Modpack
    </button>

</div>
<BackupsDialog bind:open={showBackupsDialog} />
<CommandConsole bind:open={showCommandConsole} />
<HealthDialog bind:open={showHealth} />
<ModpackDialog bind:open={showModpackDownload} />
