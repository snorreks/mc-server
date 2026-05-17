<script lang="ts">
let { open = $bindable(false) }: { open?: boolean } = $props();

const videoIds = [
  '4DPRNtQ3y_8',
  '6G7HYqjBxgg',
  'HHdNj5e6q1I',
  '9Vy-vCG06Aw',
  'FKBYWI3vqDA',
  '4JD7OqAdBhM',
  'xVQ6xMzu2pA',
  'OdEzrtQhOUI',
  'MB_Xq1Z-eZY',
  '-Kljmrtp9L8',
  'ed95gzdxzM0',
  'Ja3upeEG92Q',
  'qTTOWu4AqL8',
  'ZRNzwgQsQqE',
  'unveFSE-u14',
  'yrP43LB7QEQ',
  'n8A22Rcj-JE',
  'asoiGr0VZH4',
  '2aTzcIqYU-g',
  'RVIavddTEx0',
  'C8QXMNEYDDs',
  'FrZtZ1KgoQ0',
  'a0fLMPjBD_8',
  '2mtnregPwu8',
  'm9ODCOc1xXA',
  'dr5ly1im47A',
  'iBKjUyc0pEc',
  'ydrpx41-W8g',
  '-8vSa5Efgsw',
  'tHa52K9U4iU',
  '3NuLwOGMhp4',
  'owR4oDLFpuQ',
  'grnUX0glfME',
  'mb8eKf19Apk',
  'mvdGOzhWJIY',
  'pkejYQvkhso',
  'qGLk1GTg5Ns',
  'd538UZkBCQI',
  'AGvy8ZR7xPo',
  'UJb47GVgId8',
  'vPPuVek6vWU',
  'pp2cd3UoJP4',
  'EyKgQf22THg',
  'bmDdHk_X864',
  '-T9MF4LQG5I',
  'puBF96NL4HM',
  'f2f6OIh7f18',
  'f08Kuyb5GGc',
  'wGeT1HQmcCI',
  'dZStUzYE8Uw',
  'WX1gtQk6NaQ',
  'GWXXsxa2moA',
  'tyQYCGTNREk',
  'uhoNez4F4vc',
  'G17SbQv7OM4',
  '58aXCqdgjBE',
  'xxB4TDU829c',
  '1e6b5dBGmfs',
  'o5m65DWY0wo',
  'L48ydu8BB04',
  '784yJnn7pj8',
  'CqmMJV3LALo',
  'zFIBHnyF7VQ',
  'WwdQP3s6Dko',
  'v9-Oq8R_1DQ',
  'Yf_-FxFBt4I',
  'rzP_NqMVOj4',
  '-87MqGhLQmk',
  'TFWje5JJn7c',
  'NM2YmYuGTBU',
  'qGKxVCFQX-Q',
  'zIDvcWwKOJE',
  '70eJlWh48s8',
  'ILcbpzacVdQ',
  'H9LWYW3sgrI',
  'PQfXLFzircU',
  'H8ZUKMo75xs',
  'uSrhV6Dxwb4',
  '0CPYWJIT4io',
  'rqt9hdZwyY4',
  '7TuTS7GzhxA',
  'zqcWOvAJl4A',
  'STKTdk9d8D4',
  'rLe6Ip6hU3I',
  '-abNj3Imno8',
  'pZMP6DwdZlY',
  'oGu_Rwc_Hv4',
  '-RtfmcO3Wzo',
  't9n1Orq7rq0',
  'zGcwaMbc0P8',
  'tYBNx6fvIUo',
  'BW6LW4Gh9lc',
  'VXArZvLgCXs',
  'aavJx2_m8VU',
  'QOtLF0tYVW8',
  '-976TfIvJ1s',
  'qs0YyGGei_4',
  'Ruymeps9RwU',
  'x_o06lSsGIw',
  'VYzApyviTt8',
  'i4cnP3j5N1g',
  'TQdZUdsXYwQ',
  'tKDlPqJxC48',
  '6A4jv7qpFFk',
  'wm41xMaSiiM',
  '_M5epU53h_8',
  'OI4xDq2n8q0',
  'g8MUBBfP8mk',
  'Vl07iNvN9g0',
  '7vm_y72rCTk',
  'NtUTmuN2TXo',
  'Y4Fes8Up1tA',
  'r2ErsDrM1Lg',
  'rX_oCU2zGmk',
  'fpKIjZd1Epo',
  '4OPGSH4vjzU',
  'bp4_7T9J6Fg',
  'Ca284OyvE2g',
  '-r4mqeQcSNA',
  'jPhq0XD8L9U',
  'HnQs7oRYAgY',
  '_dwwFBb4AMY',
  'k7KAI7c3SH4',
  'vSf7lqy6HZ8',
  'bSi9xHBIKzA',
  'zc-jtMUFqOY',
  '-jopFJpLw4I',
  'CAkYywTpz78',
  '0rjAcDoso8w',
  'zIjkJkVdieU',
  'Kssoe_Lh4W4',
  'BlRIHaBpqnE',
  'J9MhhdLns_k',
  'HMlh-WOPrUQ',
  '0fu6gE_j318',
  'DY3N3XqnncI',
  '7qbu0HUG-aA',
  'Sll7NHQy_KA',
  'vBP5y8KQNJc',
];

const failedVideoIds = new Set<string>();
let dialogEl = $state<HTMLDialogElement>();
let iframeEl = $state<HTMLIFrameElement>();
let videoId = $state('');
let isLoadingVideo = $state(false);

$effect(() => {
  if (iframeEl && !isLoadingVideo) {
    iframeEl.src = open && videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1` : '';
  }
});

$effect(() => {
  if (open && dialogEl) {
    dialogEl.showModal();
    pickWorkingVideo();
  }
});

async function pickWorkingVideo() {
  if (isLoadingVideo) return;
  isLoadingVideo = true;
  videoId = '';

  const available = videoIds.filter(id => !failedVideoIds.has(id));
  const candidates = available.length > 0 ? available : videoIds;

  // Shuffle candidates for randomness
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);

  for (const id of shuffled) {
    const valid = await checkVideoExists(id);
    if (valid) {
      videoId = id;
      isLoadingVideo = false;
      return;
    }
    failedVideoIds.add(id);
  }

  // All videos failed — show the last candidate anyway
  videoId = shuffled[0];
  isLoadingVideo = false;
}

async function checkVideoExists(id: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
    );
    return res.ok;
  } catch {
    // Network/CORS error — optimistically assume video exists
    return true;
  }
}

function onIframeError() {
  if (videoId) {
    failedVideoIds.add(videoId);
    pickWorkingVideo();
  }
}

function onDialogClose() {
  open = false;
}
</script>

<dialog bind:this={dialogEl} class="modal" onclose={onDialogClose}>
  <div class="modal-box max-w-3xl bg-black p-0">
    <form method="dialog">
      <button class="btn btn-circle btn-ghost btn-sm absolute right-2 top-2 z-10 text-white">✕</button>
    </form>
    {#if isLoadingVideo}
      <div class="flex h-[480px] w-full items-center justify-center rounded-box bg-black/80">
        <span class="loading loading-spinner loading-lg text-white"></span>
      </div>
    {:else}
      <iframe
        bind:this={iframeEl}
        width="100%"
        height="480"
        title="Random video"
        src=""
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        class="rounded-box"
        onerror={onIframeError}
      ></iframe>
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
