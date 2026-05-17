<script lang="ts">
let { open = $bindable(false) }: { open?: boolean } = $props();

const allVideos = [
  '4DPRNtQ3y_8', '6G7HYqjBxgg', '9Vy-vCG06Aw',
  'FKBYWI3vqDA', '4JD7OqAdBhM', 'xVQ6xMzu2pA', 'OdEzrtQhOUI',
  'ed95gzdxzM0', 'Ja3upeEG92Q',
  'qTTOWu4AqL8', 'ZRNzwgQsQqE', 'unveFSE-u14', 'yrP43LB7QEQ',
  'n8A22Rcj-JE', 'asoiGr0VZH4', '2aTzcIqYU-g', 'RVIavddTEx0',
  'C8QXMNEYDDs', 'FrZtZ1KgoQ0', '2mtnregPwu8',
  'm9ODCOc1xXA', 'iBKjUyc0pEc', 'ydrpx41-W8g',
  '-8vSa5Efgsw', 'tHa52K9U4iU', '3NuLwOGMhp4', 'owR4oDLFpuQ',
  'grnUX0glfME', 'mb8eKf19Apk', 'mvdGOzhWJIY', 'pkejYQvkhso',
  'qGLk1GTg5Ns', 'd538UZkBCQI', 'UJb47GVgId8',
  'vPPuVek6vWU', 'EyKgQf22THg', 'bmDdHk_X864',
  '-T9MF4LQG5I', 'f2f6OIh7f18', 'f08Kuyb5GGc',
  'wGeT1HQmcCI', 'WX1gtQk6NaQ', 'GWXXsxa2moA',
  'uhoNez4F4vc', 'G17SbQv7OM4', '58aXCqdgjBE',
  'xxB4TDU829c', '1e6b5dBGmfs', 'o5m65DWY0wo',   'CqmMJV3LALo', 'zFIBHnyF7VQ', 'WwdQP3s6Dko',
  'v9-Oq8R_1DQ', 'rzP_NqMVOj4', '-87MqGhLQmk',
  'TFWje5JJn7c', 'NM2YmYuGTBU', 'qGKxVCFQX-Q', 'zIDvcWwKOJE',
  '70eJlWh48s8', 'ILcbpzacVdQ', 'H9LWYW3sgrI', 'PQfXLFzircU',
  'H8ZUKMo75xs', 'uSrhV6Dxwb4', '0CPYWJIT4io', 'rqt9hdZwyY4',
  '7TuTS7GzhxA', 'zqcWOvAJl4A', 'STKTdk9d8D4', 'rLe6Ip6hU3I',
  '-abNj3Imno8', 'pZMP6DwdZlY', 'oGu_Rwc_Hv4', '-RtfmcO3Wzo',
  't9n1Orq7rq0', 'zGcwaMbc0P8', 'tYBNx6fvIUo', 'BW6LW4Gh9lc',
  'VXArZvLgCXs', 'aavJx2_m8VU', 'QOtLF0tYVW8', '-976TfIvJ1s',
  'qs0YyGGei_4', 'Ruymeps9RwU', 'x_o06lSsGIw', 'VYzApyviTt8',
  'i4cnP3j5N1g', 'TQdZUdsXYwQ', 'tKDlPqJxC48', '6A4jv7qpFFk',
  'wm41xMaSiiM', '_M5epU53h_8', 'OI4xDq2n8q0', 'g8MUBBfP8mk',
  'Vl07iNvN9g0', '7vm_y72rCTk', 'NtUTmuN2TXo', 'Y4Fes8Up1tA',
  'r2ErsDrM1Lg', 'rX_oCU2zGmk', 'fpKIjZd1Epo', '4OPGSH4vjzU',
  'bp4_7T9J6Fg', 'Ca284OyvE2g', '-r4mqeQcSNA', 'jPhq0XD8L9U',
  'HnQs7oRYAgY', '_dwwFBb4AMY', 'k7KAI7c3SH4', 'vSf7lqy6HZ8',
  'bSi9xHBIKzA', 'zc-jtMUFqOY', '-jopFJpLw4I', 'CAkYywTpz78',
  '0rjAcDoso8w', 'zIjkJkVdieU', 'Kssoe_Lh4W4', 'BlRIHaBpqnE',
  'J9MhhdLns_k', 'HMlh-WOPrUQ', '0fu6gE_j318', 'DY3N3XqnncI',
  '7qbu0HUG-aA', 'Sll7NHQy_KA', 'vBP5y8KQNJc',
  'KiWm26Xvd_4', 'NdtvdBDJdJA', 'Nk_tBMNDhpo', 'LifAnC8S4B0',
  'TnH4_Y8gUKs', 'qNZRX0TnMWU', 'ZjATLuEN94M', '6BrNa3TfT9M',
  'W-efNmcNjI8', 'p5AF_3SQ4tY', 'o8wNv9dqEeI', 'uIwoZj8UXag',
  'CBJ_hkeTAZ8', 'IMwid7-hdSQ', 'HlgiAOGtK1k', 't9euX3XW3-Y',
  'nUL6AIXcCgI', 'q36hTdtjrw0', 'b9aZSsAa1Ls', 'yklO04eucMI',
  'saH055Q4AFA', 'WvTs0Gz1hHY', 'aPgSkT2gzjs', 'Qs4nxhVy0F4',
  '1yMozrDEqbg',
  'hrZWEEmafKQ', '5E2tq6Gb0zo', '_zXzVN_nwxI', 'W01i5FFBZEQ',
  'WIPGWRYWbgw', 'CA5gjEzZnao', 'l1Ob2OfCbdo', 'Sm5CdQ-uHg8',
  'oHsZ7Se97nA', 'MTo276JW110', 'R6p_zsCdHHM', 'xo33c2otQUo',
  '2AqqMYpFiu4', '2nrwt3QnYzA', '70vfLYvZG2g', 'lmRYiMA7IM4',
  'h_YlgD55dI4', 'SaaQzgZu09g', 'd8ehWirRtbE', 'Njl9T58gb44',
  'FbcyDq2Tq3s',
];

let dialogEl = $state<HTMLDialogElement>();
let playerEl = $state<HTMLDivElement>();
let player: YT.Player | null = $state(null);
let apiReady = $state(false);
let initAttempted = $state(false);

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

let playlist = $state(shuffle(allVideos));
let currentIndex = $state(0);
let autoPlay = $state(true);

// Load YouTube IFrame API once
$effect(() => {
  if (typeof window === 'undefined') return;
  if ((window as any).YT?.Player) {
    apiReady = true;
    return;
  }
  if (document.querySelector('script[src*="iframe_api"]')) return;

  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const first = document.getElementsByTagName('script')[0];
  first.parentNode?.insertBefore(tag, first);

  (window as any).onYouTubeIframeAPIReady = () => {
    apiReady = true;
  };
});

// Open dialog + init player when open becomes true
$effect(() => {
  if (!open) return;
  dialogEl?.showModal();
  playlist = shuffle(allVideos);
  currentIndex = 0;
  initAttempted = false;
});

// Initialize or update player when conditions are met
$effect(() => {
  if (!open || !apiReady || !playerEl || currentIndex < 0 || initAttempted) return;
  initAttempted = true;

  const id = playlist[currentIndex];

  if (player && typeof player.loadVideoById === 'function') {
    player.loadVideoById(id);
    return;
  }

  // Use setTimeout to ensure the DOM is rendered
  setTimeout(() => {
    if (!playerEl || !open) return;
    try {
      const p = new (window as any).YT.Player(playerEl, {
        width: '100%',
        height: 480,
        videoId: id,
        playerVars: { autoplay: 1, controls: 1, rel: 0 },
        events: {
          onReady: (e: YT.PlayerEvent) => { e.target.playVideo(); },
          onStateChange: (e: YT.OnStateChangeEvent) => {
            if (e.data === (window as any).YT.PlayerState.ENDED) {
              if (autoPlay && open) setTimeout(() => { if (autoPlay && open) nextVideo(); }, 500);
            }
          },
          onError: () => { if (open) nextVideo(); },
        },
      });
      player = p;
    } catch (e) {
      console.error('[video] player init failed', e);
    }
  }, 100);
});

function loadVideo(id: string) {
  if (player && typeof player.loadVideoById === 'function') {
    player.loadVideoById(id);
  } else {
    // Player not ready yet — update index, init re-triggers on next effect
    const idx = playlist.indexOf(id);
    if (idx >= 0) currentIndex = idx;
  }
}

function nextVideo() {
  let nextIdx: number;
  if (currentIndex + 1 >= playlist.length) {
    playlist = shuffle(allVideos);
    nextIdx = 0;
  } else {
    nextIdx = currentIndex + 1;
  }
  currentIndex = nextIdx;
  initAttempted = false;
  const id = playlist[nextIdx];
  if (player && typeof player.loadVideoById === 'function') {
    player.loadVideoById(id);
  }
}

function onDialogClose() {
  open = false;
  currentIndex = -1;
  if (player && typeof player.stopVideo === 'function') {
    try { player.stopVideo(); } catch { /* noop */ }
  }
}
</script>

<dialog bind:this={dialogEl} class="modal" onclose={onDialogClose}>
  <div class="modal-box max-w-3xl bg-black p-0">
    <form method="dialog">
      <button class="btn btn-circle btn-ghost btn-sm absolute right-2 top-2 z-10 text-white">✕</button>
    </form>
    <div class="relative">
      {#if open && currentIndex >= 0}
        <div bind:this={playerEl} class="w-full" style="height: 480px"></div>
        <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
          <button onclick={nextVideo} class="btn btn-sm btn-ghost text-white/70 hover:text-white bg-black/40 rounded-full px-4">
            ⏭ Next
          </button>
          <label class="flex items-center gap-1.5 text-xs text-white/50">
            <input type="checkbox" bind:checked={autoPlay} class="toggle toggle-xs" />
            Auto
          </label>
        </div>
        <div class="absolute top-3 left-3 z-10 text-xs text-white/50 bg-black/40 rounded-full px-2 py-0.5">
          {currentIndex + 1} / {playlist.length}
        </div>
      {/if}
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
