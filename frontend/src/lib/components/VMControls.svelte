<script lang="ts">
    // frontend/src/lib/components/VMControls.svelte
    import { authStore } from '$lib/client/services/auth.svelte';

    let {
        loading = false,
        serverIsOn = false,
        onCheck = () => {},
        onStart = () => {},
        onStop = () => {},
        onDelay = () => {},
        onBackup = () => {},
    }: {
        loading?: boolean;
        serverIsOn?: boolean;
        onCheck?: () => void;
        onStart?: () => void;
        onStop?: () => void;
        onDelay?: () => void;
        onBackup?: () => void;
    } = $props();

    let confirmStop = $state(false);

    function confirmStopServer() {
        confirmStop = false;
        onStop();
    }
</script>

<div class="card bg-base-100 shadow-sm border border-base-200">
    <div class="card-body p-4 space-y-3">
        <h2 class="card-title text-sm opacity-60 uppercase tracking-wider">Admin Controls</h2>
        
        <div class="grid grid-cols-2 gap-2">
            <button onclick={onCheck} disabled={loading} class="btn btn-outline btn-sm h-10">
                {#if loading} <span class="loading loading-spinner loading-xs"></span> {/if}
                🔍 Check Status
            </button>

            {#if $authStore.isActive}
                <button onclick={onBackup} disabled={loading} class="btn btn-outline btn-sm h-10">
                    💾 Backups
                </button>

                {#if !serverIsOn}
                    <button onclick={onStart} disabled={loading} class="btn btn-success btn-sm h-10 col-span-2 text-white">
                        ▶️ Start Server
                    </button>
                {/if}

                {#if serverIsOn}
                    <button onclick={onDelay} disabled={loading} class="btn btn-info btn-sm h-10 text-white">
                        ⏳ Delay Shutdown
                    </button>

                    {#if confirmStop}
                        <div class="col-span-2 bg-error/10 rounded-box p-2 flex gap-2 items-center justify-between border border-error/20">
                            <span class="text-xs font-medium text-error pl-2">Kick players & stop?</span>
                            <div class="join">
                                <button onclick={confirmStopServer} disabled={loading} class="btn btn-error btn-xs join-item text-white">Stop</button>
                                <button onclick={() => (confirmStop = false)} disabled={loading} class="btn btn-ghost btn-xs join-item">Cancel</button>
                            </div>
                        </div>
                    {:else}
                        <button onclick={() => (confirmStop = true)} disabled={loading} class="btn btn-error btn-sm h-10 text-white">
                            ⏹️ Stop Server
                        </button>
                    {/if}
                {/if}
            {/if}
        </div>
    </div>
</div>
