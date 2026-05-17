<script lang="ts">
    // frontend/src/lib/components/CommandConsole.svelte
    let { open = $bindable(false) }: { open?: boolean } = $props();

    let dialogEl = $state<HTMLDialogElement>();
    let command = $state('');
    let output = $state('');
    let loading = $state(false);
    let error = $state('');
    let historyIndex = $state(-1);
    let history: string[] = $state([]);

    $effect(() => {
        if (open && dialogEl) {
            dialogEl.showModal();
        }
    });

    function onDialogClose() {
        open = false;
    }

    async function sendCommand() {
        const cmd = command.trim();
        if (!cmd) return;

        loading = true;
        error = '';
        output = '';

        // Add to history (avoid duplicates at the end)
        if (history[history.length - 1] !== cmd) {
            history = [...history, cmd];
        }
        historyIndex = history.length;

        try {
            const res = await fetch('/api/rcon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd }),
            });
            const data = await res.json();
            if (data.error) {
                error = data.error;
            } else {
                output = data.output || '(no output)';
            }
        } catch (e) {
            error = e instanceof Error ? e.message : 'Request failed';
        } finally {
            loading = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendCommand();
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                command = history[historyIndex];
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < history.length - 1) {
                historyIndex++;
                command = history[historyIndex];
            } else {
                historyIndex = history.length;
                command = '';
            }
            return;
        }
    }

    function close() {
        open = false;
        command = '';
        output = '';
        error = '';
    }
</script>

<dialog bind:this={dialogEl} class="modal" onclose={onDialogClose}>
    <div class="modal-box max-w-lg">
        <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-bold">💻 Server Console</h3>
            <form method="dialog">
                <button class="btn btn-circle btn-ghost btn-sm">✕</button>
            </form>
        </div>

        <p class="text-xs text-base-content/60 mb-3">
            Send Minecraft server commands directly. Prefix with <code class="kbd kbd-xs">/</code> is optional.
        </p>

        <div class="join w-full">
            <input
                type="text"
                bind:value={command}
                onkeydown={handleKeydown}
                placeholder="/op player"
                disabled={loading}
                class="input input-bordered join-item w-full font-mono text-sm"
            />
            <button onclick={sendCommand} disabled={loading || !command.trim()} class="btn join-item px-6">
                {#if loading}
                    <span class="loading loading-spinner loading-xs"></span>
                {:else}
                    Send
                {/if}
            </button>
        </div>

        {#if error}
            <div class="alert alert-error mt-3 py-2 text-sm">
                <span>{error}</span>
            </div>
        {/if}

        {#if output}
            <div class="bg-base-300 rounded-lg p-3 mt-3 font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
                {output}
            </div>
        {/if}

        {#if history.length > 0}
            <div class="mt-3 text-xs text-base-content/40">
                <span>Use ↑↓ for command history ({history.length} commands)</span>
            </div>
        {/if}
    </div>
    <form method="dialog" class="modal-backdrop">
        <button>close</button>
    </form>
</dialog>
