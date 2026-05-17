<script lang="ts">
// frontend/src/routes/+layout.svelte
import '../app.css';
import { onMount } from 'svelte';
import { authStore } from '$lib/client/services/auth.svelte';
import { init as initServerStatus } from '$lib/client/services/firestore.svelte';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from '$lib/client/firebase';
import { AG_ALLOWED_EMAILS_PATH } from '$config';

// Random OG image for social sharing — picks one on each page load
const OG_IMAGES = ['4am.webp','angy-cat.webp','ballin.webp','banana.webp','block.webp','cat-model.webp','CAT.webp','cow-doggo.webp','cringe.webp','denial.webp','despair.webp','dog-aoty.jpg','doggy.webp','dogy.webp','dunk.webp','d.webp','fish.webp','folly.webp','gnwoke.webp','goat.webp','horrorbliss.webp','idk.webp','itdogodown.jpg','opsi.webp','pain.webp','perpendicular.webp','prime.webp','pupper.webp','qoute.webp','Redcord.webp','rock.jpg','sauce_no_finder.jpg','second-vice.jpg','situation.webp','ss.webp','therapy.webp','the_worst_vice.webp','thief.webp','thinking.webp','tiger-kill.webp','tom.webp','true_evil.webp','unholy_rizz.webp','unnamedunnamed.webp','where_is_my_mind.webp','whut.webp','wiener.webp','word.jpg','xAR.webp','yeah.jpg'];
const OG_BASE = 'https://agmcserver.netlify.app/images/';
let ogImage = $state(OG_IMAGES[Math.floor(Math.random() * OG_IMAGES.length)]);

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
] as const;

let activeThemeIcon = $derived(
  currentTheme === 'system' ? '💻' : THEMES.find((t) => t.value === currentTheme)?.icon || '☀️',
);

onMount(() => {
  authStore.init();
  initServerStatus();
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

    const db = getFirebaseFirestore();
    const docSnap = await getDoc(doc(db, AG_ALLOWED_EMAILS_PATH));
    const allowedEmails = (docSnap.data() ?? {}) as Record<string, boolean>;

    if (!allowedEmails[email]) {
      await auth.signOut();
      throw new Error('Unauthorized. Admin access required.');
    }
  } catch (e: any) {
    if (!e.message.includes('popup-closed')) showError(e.message || 'Sign in failed');
  } finally {
    isAuthenticating = false;
  }
}
</script>

<svelte:head>
  <meta property="og:image" content="{OG_BASE + ogImage}" />
  <meta name="twitter:image" content="{OG_BASE + ogImage}" />
</svelte:head>

<div class="min-h-screen bg-base-200/50 pb-10" data-theme={currentTheme === 'system' ? undefined : currentTheme}>
    <div class="navbar bg-base-100 shadow-sm px-4 sticky top-0 z-50">
        <div class="flex-1">
            <span class="text-xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">AG Server</span>
        </div>
        <div class="flex-none gap-2">
                    <div class="dropdown dropdown-end">
                        <button tabindex="0" class="btn btn-ghost btn-circle text-lg" aria-label="Change theme">
                            {activeThemeIcon}
                        </button>
                        <ul tabindex="-1" class="dropdown-content menu menu-sm bg-base-100 rounded-box z-[1] w-40 p-2 shadow-lg border border-base-200">
                            {#each THEMES as t}
                                <li>
                                    <button onclick={() => setTheme(t.value)} class={currentTheme === t.value ? 'active' : ''}>
                                        {t.icon} {t.label}
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    </div>

            {#if $authStore.isSignedIn}
                <div class="dropdown dropdown-end">
                    <button tabindex="0" class="btn btn-ghost btn-circle avatar">
                        <div class="w-9 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                            {#if $authStore.photoURL}
                                <img src={$authStore.photoURL} alt={$authStore.displayName} referrerpolicy="no-referrer" />
                            {:else}
                                <div class="bg-primary text-primary-content text-sm font-bold flex items-center justify-center w-full h-full">
                                    {$authStore.displayName?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                            {/if}
                        </div>
                    </button>
                    <ul tabindex="-1" class="dropdown-content menu menu-sm bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg border border-base-200 mt-3">
                        <li class="menu-title px-4 py-2 text-xs opacity-60">{$authStore.email}</li>
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
