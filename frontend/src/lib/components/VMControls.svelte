<script lang="ts">
// frontend/src/lib/components/VMControls.svelte

let {
  loading = false,
  serverIsOn = false,
  isActive = false,
  onStart = () => {},
  onStop = () => {},
  onDelay = () => {},
  onBackup = () => {},
} = $props();

let showStopModal = $state(false);

function confirmStopServer() {
  showStopModal = false;
  onStop();
}
</script>

{#if isActive}
    <div class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-4 space-y-3">
            <h2 class="card-title text-sm opacity-60 uppercase tracking-wider">Admin Controls</h2>

            <div class="grid grid-cols-2 gap-2">
                <button onclick={() => onBackup()} disabled={loading} class="btn btn-outline btn-sm h-10 col-span-2">
                    💾 Open Backups
                </button>

                {#if !serverIsOn}
                    <button onclick={() => onStart()} disabled={loading} class="btn btn-success btn-sm h-10 col-span-2 text-white">
                        ▶️ Start Server
                    </button>
                {/if}

                {#if serverIsOn}
                    <button onclick={() => onDelay()} disabled={loading} class="btn btn-info btn-sm h-10 text-white">
                        ⏳ Delay Shutdown
                    </button>

                    <button onclick={() => (showStopModal = true)} disabled={loading} class="btn btn-error btn-sm h-10 text-white">
                        ⏹️ Stop Server
                    </button>
                {/if}
            </div>
        </div>
    </div>
{/if}

<dialog class="modal" class:modal-open={showStopModal}>
    <div class="modal-box">
        <h3 class="font-bold text-lg text-error">Warning: Stopping Server!</h3>
        <p class="py-4">Are you sure you want to stop the server? Any players currently online will be kicked immediately.</p>
        <div class="modal-action">
            <button class="btn" onclick={() => (showStopModal = false)}>Cancel</button>
            <button class="btn btn-error text-white" onclick={() => confirmStopServer()}>Yes, Stop Server</button>
        </div>
    </div>
    <form method="dialog" class="modal-backdrop">
        <button onclick={() => (showStopModal = false)}>close</button>
    </form>
</dialog>
