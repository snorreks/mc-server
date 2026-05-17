<script lang="ts">
let { open = $bindable(false) }: { open?: boolean } = $props();

let dialogEl = $state<HTMLDialogElement>();
let players: { name: string; avatarUrl: string }[] = $state([]);
let count = $state(0);
let loading = $state(false);
let error = $state('');

$effect(() => {
  if (open && dialogEl) {
    loadPlayers();
    dialogEl.showModal();
  }
});

function onDialogClose() {
  open = false;
}

async function loadPlayers() {
  loading = true;
  error = '';
  try {
    const res = await fetch('/api/players');
    const data = await res.json();
    players = data.players;
    count = data.count;
    if (data.error) error = data.error;
  } catch (e) {
    error = 'Failed to query server';
  } finally {
    loading = false;
  }
}
</script>

<dialog bind:this={dialogEl} class="modal" onclose={onDialogClose}>
  <div class="modal-box max-w-xs">
    <form method="dialog">
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
    </form>
    <h3 class="text-lg font-bold mb-4">Online Players</h3>

    {#if loading}
      <div class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    {:else if error}
      <div class="alert alert-error">
        <span>{error}</span>
        <button onclick={loadPlayers} class="btn btn-sm">Retry</button>
      </div>
    {:else if count === 0}
      <p class="py-8 text-center text-base-content/60">No players online</p>
    {:else}
      <p class="text-sm text-base-content/60 mb-3">{count} player{count !== 1 ? 's' : ''} online</p>
      <ul class="list">
        {#each players as player}
          <li class="list-row flex items-center gap-3">
            <div class="avatar">
              <div class="w-8 rounded-full">
                <img src={player.avatarUrl} alt={player.name} loading="lazy" />
              </div>
            </div>
            <span class="font-medium">{player.name}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
