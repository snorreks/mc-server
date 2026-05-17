<script lang="ts">
    // frontend/src/lib/components/HealthDialog.svelte
    let { open = $bindable(false) }: { open?: boolean } = $props();

    let dialogEl = $state<HTMLDialogElement>();
    let info = $state<string[]>([]);
    let loading = $state(false);

    $effect(() => {
        if (open && dialogEl) {
            dialogEl.showModal();
            check();
        }
    });

    function onDialogClose() {
        open = false;
    }

    async function check() {
        loading = true;
        info = [];

        // TPS via RCON
        try {
            const rconRes = await fetch('/api/rcon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'forge tps' }),
            });
            const rconData = await rconRes.json();
            if (rconData.output) {
                const lines = rconData.output.split('\n').filter((l: string) => l.trim());
                info.push(...lines.filter((l: string) => l.includes('Overall') || l.includes('overworld')));
            } else {
                info.push('RCON: ' + (rconData.error || 'no response'));
            }
        } catch {
            info.push('RCON: failed');
        }

        // Difficulty via RCON
        try {
            const res = await fetch('/api/rcon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'difficulty' }),
            });
            const data = await res.json();
            if (data.output) info.push(data.output.trim());
        } catch { /* noop */ }

        // Server info
        try {
            const res = await fetch('/api/server-info');
            const data = await res.json();
            if (data.error) info.push('Server info: ' + data.error);
            else info.push(`Players: ${data.online}/${data.max} · View: ${data.viewDistance}`);
        } catch { /* noop */ }

        loading = false;
    }
</script>

<dialog bind:this={dialogEl} class="modal" onclose={onDialogClose}>
    <div class="modal-box max-w-sm">
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-bold">🩺 Server Health</h3>
            <form method="dialog">
                <button class="btn btn-circle btn-ghost btn-sm">✕</button>
            </form>
        </div>

        {#if loading}
            <div class="flex justify-center py-6">
                <span class="loading loading-spinner loading-md"></span>
            </div>
        {:else if info.length > 0}
            <div class="space-y-1 text-xs font-mono">
                {#each info as line}
                    <div class="bg-base-300 rounded px-2 py-1">{line}</div>
                {/each}
            </div>
        {:else}
            <p class="text-sm text-base-content/60 py-4 text-center">Run a check to see server health</p>
        {/if}

        <div class="modal-action">
            <button onclick={check} class="btn btn-primary btn-sm">🔄 Refresh</button>
        </div>
    </div>
    <form method="dialog" class="modal-backdrop">
        <button>close</button>
    </form>
</dialog>
