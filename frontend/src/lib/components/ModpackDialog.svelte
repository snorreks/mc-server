<script lang="ts">
    // frontend/src/lib/components/ModpackDialog.svelte
    import { getModpackDownloadURL } from '$lib/client/services/storage.svelte';

    let { open = $bindable(false) }: { open?: boolean } = $props();

    let modpackUrl = $state('');
    let copied = $state(false);
    let currentStep = $state(1);

    $effect(() => {
        if (open && !modpackUrl) {
            currentStep = 1; // Reset wizard on open
            getModpackDownloadURL()
                .then((url) => (modpackUrl = url))
                .catch(() => {});
        }
    });

    async function copyUrl() {
        try {
            await navigator.clipboard.writeText(modpackUrl);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = modpackUrl;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        copied = true;
        setTimeout(() => (copied = false), 2000);
    }
</script>

<dialog class="modal modal-bottom sm:modal-middle" class:modal-open={open}>
    <div class="modal-box">
        <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onclick={() => (open = false)}>✕</button>
        </form>

        <h3 class="text-xl font-black mb-6">📦 Install Modpack</h3>

        <ul class="steps w-full mb-8">
            <li class="step {currentStep >= 1 ? 'step-primary' : ''}">Launcher</li>
            <li class="step {currentStep >= 2 ? 'step-primary' : ''}">Import URL</li>
            <li class="step {currentStep >= 3 ? 'step-primary' : ''}">Optimize</li>
        </ul>

        {#if currentStep === 1}
            <div class="space-y-4 animate-fade-in">
                <h4 class="font-bold text-lg">1. Get Prism Launcher</h4>
                <p class="text-sm text-base-content/70">We highly recommend Prism Launcher for easy modpack installation.</p>
                <a href="https://prismlauncher.org/download" target="_blank" rel="noopener noreferrer" class="btn btn-primary w-full">
                    Download Prism Launcher
                </a>
            </div>
        {/if}

        {#if currentStep === 2}
            <div class="space-y-4 animate-fade-in">
                <h4 class="font-bold text-lg">2. Import from Zip URL</h4>
                <p class="text-sm text-base-content/70">In Prism, click <strong>Add Instance</strong>, choose <strong>Import</strong>, and paste this URL:</p>
                <div class="join w-full shadow-sm">
                    <input readonly value={modpackUrl} class="input input-bordered join-item w-full font-mono text-xs focus:outline-none" />
                    <button onclick={copyUrl} class="btn {copied ? 'btn-success' : 'btn-neutral'} join-item w-28">
                        {copied ? '✅ Copied' : '📋 Copy'}
                    </button>
                </div>
            </div>
        {/if}

        {#if currentStep === 3}
            <div class="space-y-4 animate-fade-in">
                <h4 class="font-bold text-lg">3. Boost Performance</h4>
                <p class="text-sm text-base-content/70">Go to Instance <strong>Settings → Java</strong>. Set Max Memory to <strong>8192 MB</strong>, and paste these JVM arguments:</p>
                <div class="bg-base-200 p-3 rounded-lg font-mono text-xs overflow-x-auto relative group">
                    <code>-XX:+UseG1GC -XX:MaxGCPauseMillis=50 -XX:+UnlockExperimentalVMOptions</code>
                </div>
                <p class="text-sm font-bold text-success mt-2">You're ready! Launch the instance and play.</p>
            </div>
        {/if}

        <div class="modal-action mt-8 flex justify-between">
            <button class="btn" disabled={currentStep === 1} onclick={() => currentStep--}>Back</button>
            
            {#if currentStep < 3}
                <button class="btn btn-primary" onclick={() => currentStep++}>Next</button>
            {:else}
                <button class="btn btn-primary" onclick={() => (open = false)}>Done</button>
            {/if}
        </div>
    </div>
    <form method="dialog" class="modal-backdrop">
        <button onclick={() => (open = false)}>close</button>
    </form>
</dialog>
