<script lang="ts">
import { toCalendar } from '$lib/utils/date';

let { open = $bindable(false) }: { open?: boolean } = $props();

let dialogEl = $state<HTMLDialogElement>();
let players: { name: string; avatarUrl: string; lastOnline: string | Date | { _seconds?: number }; online: boolean }[] = $state([]);
let onlineCount = $state(0);
let totalCount = $state(0);
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
    const res = await fetch('/api/players/all');
    const data = await res.json();
    players = data.players;
    onlineCount = data.onlineCount;
    totalCount = data.totalCount;
    if (data.error) error = data.error;
  } catch (e) {
    error = 'Failed to query server';
  } finally {
    loading = false;
  }
}
</script>

<dialog bind:this={dialogEl} class="modal" onclose={onDialogClose}>
  <div class="modal-box max-w-sm">
    <form method="dialog">
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
    </form>
    <h3 class="text-lg font-bold mb-1">👥 Players</h3>
    {#if !loading && !error}
      <p class="text-xs text-base-content/50 mb-3">
        {onlineCount} online · {totalCount} total known
      </p>
    {/if}

    {#if loading}
      <div class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    {:else if error}
      <div class="alert alert-error">
        <span>{error}</span>
        <button onclick={loadPlayers} class="btn btn-sm">Retry</button>
      </div>
    {:else if totalCount === 0}
      <div class="flex flex-col items-center gap-2 py-6 text-base-content/40">
        <span class="text-3xl">👻</span>
        <p class="text-sm">No players have joined yet</p>
      </div>
    {:else}
      <div class="space-y-0.5 max-h-80 overflow-y-auto">
        {#each players as player}
          <div
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-base-200 transition-colors{player.online ? ' bg-success/10' : ''}"
          >
            <div class="avatar flex-shrink-0 relative">
              <div class="w-8 rounded-full">
                <img src={player.avatarUrl} alt={player.name} loading="lazy" />
              </div>
              {#if player.online}
                <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-base-100"></span>
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <span class="text-sm font-medium block truncate">{player.name}</span>
              <span class="text-[10px] text-base-content/40">
                {player.online ? 'Online now' : `Last seen ${toCalendar(player.lastOnline)}`}
              </span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
