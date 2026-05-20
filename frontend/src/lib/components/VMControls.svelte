<script lang="ts">
// frontend/src/lib/components/VMControls.svelte

let {
  loading = false,
  serverIsOn = false,
  isActive = false,
  isSuperAdmin = false,
  onStart = () => {},
  onStop = () => {},
  onBackup = () => {},
  onCommand = () => {},
  onHealth = () => {},
} = $props();

let showStopModal = $state(false);

function confirmStopServer() {
  showStopModal = false;
  onStop();
}
</script>

{#if isActive}
    <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-5 space-y-4">
            <h2 class="text-xs font-bold uppercase tracking-wider text-base-content/60">Admin Controls</h2>

            <div class="flex flex-col gap-2">
                <button
                    onclick={() => onBackup()}
                    disabled={loading}
                    class="btn btn-block justify-start gap-3 font-medium px-4 border border-base-300 bg-base-200 text-base-content hover:bg-base-300 hover:border-base-400"
                >
                    <span>💾</span> Open Backups
                </button>

                {#if isSuperAdmin}
                    <button
                        onclick={() => onCommand()}
                        disabled={loading}
                        class="btn btn-block justify-start gap-3 font-medium px-4 border border-base-300 bg-base-200 text-base-content hover:bg-base-300 hover:border-base-400"
                    >
                        <span>💻</span> Access Console
                    </button>
                {/if}

                <button
                    onclick={() => onHealth()}
                    disabled={loading}
                    class="btn btn-block justify-start gap-3 font-medium px-4 border border-base-300 bg-base-200 text-base-content hover:bg-base-300 hover:border-base-400"
                >
                    <span>🩺</span> Diagnostic Health
                </button>

                <div class="pt-3 border-t border-base-200 mt-1">
                    {#if !serverIsOn}
                        <button onclick={() => onStart()} disabled={loading} class="btn btn-success btn-sm w-full gap-2 text-white font-semibold">
                            ▶️ Start Server
                        </button>
                    {:else}
                        <button onclick={() => (showStopModal = true)} disabled={loading} class="btn btn-error btn-sm w-full gap-2 text-white font-semibold">
                            ⏹️ Stop Server
                        </button>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<dialog class="modal" class:modal-open={showStopModal}>
    <div class="modal-box border border-base-300 shadow-xl max-w-sm rounded-2xl">
        <h3 class="font-bold text-lg text-error flex items-center gap-2">⚠️ Dangerous Action</h3>
        <p class="py-3 text-sm text-base-content/70">Are you sure you want to stop the server? Active players will be disconnected immediately.</p>
        <div class="modal-action gap-2">
            <button class="btn btn-ghost btn-sm font-medium" onclick={() => (showStopModal = false)}>Cancel</button>
            <button class="btn btn-error btn-sm text-white font-semibold" onclick={() => confirmStopServer()}>Stop Server</button>
        </div>
    </div>
    <form method="dialog" class="modal-backdrop bg-base-300/40 backdrop-blur-xs">
        <button onclick={() => (showStopModal = false)}>close</button>
    </form>
</dialog>
