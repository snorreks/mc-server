<script lang="ts">
// frontend/src/routes/+layout.svelte
import '../app.css';
import { onMount } from 'svelte';
import { authStore } from '$lib/client/services/auth.svelte';
import { init as initServerStatus } from '$lib/client/services/firestore.svelte';
import { initApprovalsListener, approvals } from '$lib/client/services/approvals.svelte';
import VideoDialog from '$lib/components/VideoDialog.svelte';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from '$lib/client/firebase';
import { AG_ALLOWED_EMAILS_PATH } from '$config';

// Random OG image for social sharing — picks one on each page load
const OG_IMAGES = [
  'angy-cat.jpg',
  'ballin.jpg',
  'banana.jpg',
  'block.jpg',
  'CAT.jpg',
  'cat-model.jpg',
  'cow-doggo.jpg',
  'denial.jpg',
  'despair.jpg',
  'd.jpg',
  'dog-aoty.jpg',
  'doggy.jpg',
  'dogy.jpg',
  'dunk.jpg',
  'fish.jpg',
  'folly.jpg',
  'gnwoke.jpg',
  'goat.jpg',
  'horrorbliss.jpg',
  'itdogodown.jpg',
  'opsi.jpg',
  'pain.jpg',
  'perpendicular.jpg',
  'pupper.jpg',
  'qoute.jpg',
  'Redcord.jpg',
  'rock.jpg',
  'sauce_no_finder.jpg',
  'second-vice.jpg',
  'situation.jpg',
  'ss.jpg',
  'therapy.jpg',
  'the_worst_vice.jpg',
  'thinking.jpg',
  'tiger-kill.jpg',
  'true_evil.jpg',
  'unholy_rizz.jpg',
  'unnamed.jpg',
  'unnamedunnamed.jpg',
  'where_is_my_mind.jpg',
  'whut.jpg',
  'wiener.jpg',
  'word.jpg',
  'xAR.jpg',
  'yeah.jpg',
];
const OG_BASE = 'https://agmcs2026.web.app/images/';
let ogImage = $state(OG_IMAGES[Math.floor(Math.random() * OG_IMAGES.length)]);
let showVideo = $state(false);
let showApprovals = $state(false);

let { data, children } = $props();

// svelte-ignore state_referenced_locally
let currentTheme = $state(data.theme ?? 'system');
let isAuthenticating = $state(false);
let toastError = $state('');

// svelte-ignore state_referenced_locally
authStore.seedFromSSR(data.user);

const THEMES = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'cupcake', label: 'Cupcake', icon: '🧁' },
  { value: 'cyberpunk', label: 'Cyberpunk', icon: '⚡' },
  { value: 'retro', label: 'Retro', icon: '📟' },
  { value: 'aqua', label: 'Aqua', icon: '💧' },
  { value: 'valentine', label: 'Valentine', icon: '💕' },
  { value: 'synthwave', label: 'Synthwave', icon: '🌌' },
  { value: 'halloween', label: 'Halloween', icon: '🎃' },
  { value: 'forest', label: 'Forest', icon: '🌲' },
  { value: 'luxury', label: 'Luxury', icon: '💎' },
  { value: 'dracula', label: 'Dracula', icon: '🧛' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'acid', label: 'Acid', icon: '☣️' },
  { value: 'lemonade', label: 'Lemonade', icon: '🍋' },
  { value: 'coffee', label: 'Coffee', icon: '☕' },
  { value: 'winter', label: 'Winter', icon: '❄️' },
  { value: 'dim', label: 'Dim', icon: '🕶️' },
  { value: 'nord', label: 'Nord', icon: '🥶' },
  { value: 'sunset', label: 'Sunset', icon: '🌇' },
] as const;

let activeThemeIcon = $derived(
  currentTheme === 'system' ? '💻' : THEMES.find((t) => t.value === currentTheme)?.icon || '☀️',
);

onMount(() => {
  authStore.init();
  initServerStatus();
  initApprovalsListener();
  applyTheme(currentTheme);
});

function applyTheme(theme: string) {
  const isDark =
    theme === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  document.documentElement.setAttribute(
    'data-theme',
    theme === 'system' ? (isDark ? 'dark' : 'light') : theme,
  );
}

async function setTheme(theme: string) {
  currentTheme = theme;
  applyTheme(theme);
  fetch('/api/theme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme }),
  }).catch(console.error);
}

function showError(msg: string) {
  toastError = msg;
  setTimeout(() => (toastError = ''), 5000);
}

async function handleSignIn() {
  isAuthenticating = true;
  try {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    const email = result.user.email;
    if (!email) throw new Error('No email associated with this account.');

    const displayName = result.user.displayName;
    const photoURL = result.user.photoURL;

    const db = getFirebaseFirestore();
    const docSnap = await getDoc(doc(db, AG_ALLOWED_EMAILS_PATH));
    const allowedData = (docSnap.data() ?? {}) as Record<string, boolean | { approved: boolean }>;
    const entry = allowedData[email];
    const isAllowed = typeof entry === 'boolean' ? entry === true : entry?.approved === true;

    if (!isAllowed) {
      // Auto-add as pending with photoURL and displayName
      await fetch('/api/auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, approved: false, photoURL, displayName }),
      });
      await auth.signOut();
      throw new Error('Your access is pending approval. An admin will review your request.');
    }

    // Sync photoURL/displayName on every sign-in (handles first-time backfill + profile photo changes)
    if (photoURL || displayName) {
      fetch('/api/auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, approved: true, photoURL, displayName }),
      }).catch(() => {});
    }
  } catch (e: any) {
    if (!e.message.includes('popup-closed')) showError(e.message || 'Sign in failed');
  } finally {
    isAuthenticating = false;
  }
}

async function loadPendingApprovals() {
  showApprovals = true;
  // approvals.entries is already reactive from the Firestore listener
}

async function approveEmail(email: string) {
  await fetch('/api/auth/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, approved: true }),
  });
}

async function rejectEmail(email: string) {
  await fetch('/api/auth/approve/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}
</script>

<svelte:head>
  <meta property="og:image" content="{OG_BASE + ogImage}" />
  <meta name="twitter:image" content="{OG_BASE + ogImage}" />
</svelte:head>

<div class="min-h-screen bg-base-200/50 pb-10" data-theme={currentTheme === 'system' ? undefined : currentTheme}>
    <div class="navbar bg-base-100 shadow-sm px-4 sticky top-0 z-50">
        <div class="flex-1">
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <span onclick={() => (showVideo = true)} class="text-xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent cursor-pointer select-none">AG Server</span>
        </div>
        <div class="flex-none gap-2">

            <div class="dropdown dropdown-end">
                <button tabindex="0" class="btn btn-ghost btn-circle text-lg" aria-label="Change theme">
                    {activeThemeIcon}
                </button>

                <div
                    tabindex="-1"
                    class="dropdown-content bg-base-100 rounded-box z-50 p-3 shadow-xl border border-base-200 mt-2 grid grid-cols-2 gap-1 w-72"
                >
                    {#each THEMES as t}
                        <button
                            onclick={() => {
                                setTheme(t.value);
                                (document.activeElement as HTMLElement)?.blur();
                            }}
                            class="btn btn-ghost btn-sm justify-start gap-2 text-xs font-normal {currentTheme === t.value ? 'btn-active bg-base-200 font-semibold' : ''}"
                        >
                            <span class="text-base flex-shrink-0">{t.icon}</span>
                            <span class="truncate">{t.label}</span>
                        </button>
                    {/each}
                </div>
            </div>
            {#if $authStore.isSignedIn}
                <div class="dropdown dropdown-end">
                    <button tabindex="0" class="btn btn-ghost btn-circle avatar relative">
                        <div class="w-9 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                            {#if $authStore.photoURL}
                                <img src={$authStore.photoURL} alt={$authStore.displayName} referrerpolicy="no-referrer" />
                            {:else}
                                <div class="bg-primary text-primary-content text-sm font-bold flex items-center justify-center w-full h-full">
                                    {$authStore.displayName?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                            {/if}
                        </div>
                        {#if $authStore.isActive && approvals.hasPending}
                            <span class="absolute -top-0.5 -right-0.5">
                                <span class="relative flex h-2.5 w-2.5">
                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-60"></span>
                                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
                                </span>
                            </span>
                        {/if}
                    </button>
                    <ul tabindex="-1" class="dropdown-content menu menu-sm bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg border border-base-200 mt-3">
                        <li class="menu-title px-4 py-2 text-xs opacity-60">{$authStore.email}</li>
                        {#if $authStore.isActive}
                            <li><button onclick={loadPendingApprovals} class="text-xs">
                                👥 Pending
                                {#if approvals.hasPending}
                                    <span class="badge badge-error badge-xs ml-1">{approvals.pendingCount}</span>
                                {/if}
                            </button></li>
                        {/if}
                        <div class="divider my-0"></div>
                        <li><button class="text-error font-medium" onclick={() => authStore.signOut()}>Sign Out</button></li>
                    </ul>
                </div>
            {:else}
                <button onclick={handleSignIn} disabled={isAuthenticating} class="btn btn-primary btn-sm rounded-full px-6">
                    {#if isAuthenticating}
                        <span class="loading loading-spinner loading-xs"></span>
                    {:else}
                        Sign In
                    {/if}
                </button>
            {/if}
        </div>
    </div>

    <main class="max-w-xl mx-auto p-4 mt-4">
        {@render children()}
    </main>
</div>

{#if toastError}
    <div class="toast toast-top toast-center z-[100]">
        <div class="alert alert-error shadow-lg">
            <span>{toastError}</span>
        </div>
    </div>
{/if}

<VideoDialog bind:open={showVideo} />

<dialog class="modal" class:modal-open={showApprovals}>
  <div class="modal-box max-w-md">
    <form method="dialog">
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onclick={() => (showApprovals = false)}>✕</button>
    </form>
    <h3 class="font-bold text-lg mb-1">👥 Access Requests</h3>
    <p class="text-xs text-base-content/50 mb-4">Approve or reject email sign-up requests.</p>

    {#if approvals.entries.length === 0}
      <div class="flex flex-col items-center gap-2 py-6 text-base-content/40">
        <span class="text-3xl">📭</span>
        <p class="text-sm">No requests yet</p>
      </div>
    {:else}
      <div class="space-y-1 max-h-72 overflow-y-auto">
        {#each approvals.entries as entry}
          <div class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-base-200 transition-colors{entry.approved ? ' bg-success/10' : ''}">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="avatar flex-shrink-0">
                {#if entry.photoURL}
                  <div class="w-8 rounded-full">
                    <img src={entry.photoURL} alt={entry.email} referrerpolicy="no-referrer" />
                  </div>
                {:else}
                  <div class="w-8 rounded-full {entry.approved ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'} flex items-center justify-center">
                    <span class="text-xs font-bold">{entry.email.charAt(0).toUpperCase()}</span>
                  </div>
                {/if}
              </div>
              <div class="min-w-0">
                <span class="text-sm font-medium block truncate">{entry.displayName || entry.email}</span>
                {#if entry.displayName}
                  <span class="text-[10px] text-base-content/40 truncate block">{entry.email}</span>
                {/if}
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              {#if entry.approved}
                <span class="badge badge-success badge-sm gap-1">
                  ✓ Approved
                </span>
              {:else}
                <button onclick={() => rejectEmail(entry.email)} class="btn btn-ghost btn-xs text-error">
                  ✕
                </button>
                <button onclick={() => approveEmail(entry.email)} class="btn btn-primary btn-xs">
                  ✓ Approve
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button onclick={() => (showApprovals = false)}>close</button>
  </form>
</dialog>
