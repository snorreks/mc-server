<script lang="ts">
    // frontend/src/lib/components/LoginDialog.svelte
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from '$lib/client/firebase';
import { AG_ALLOWED_EMAILS_PATH } from '$config';

let { open = $bindable(false) }: { open?: boolean } = $props();

let dialogEl = $state<HTMLDialogElement>();
let error = $state('');
let loading = $state(false);

$effect(() => {
  if (open && dialogEl) dialogEl.showModal();
});

function onDialogClose() {
  open = false;
  error = '';
}

async function signInWithGoogle() {
  error = '';
  loading = true;
  try {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Check if email is in allowed_emails list
    const email = result.user.email;
    if (!email) {
      error = 'No email associated with this account.';
      loading = false;
      return;
    }

    const db = getFirebaseFirestore();
    const docSnap = await getDoc(doc(db, AG_ALLOWED_EMAILS_PATH));
    const allowedEmails = (docSnap.data() ?? {}) as Record<string, boolean>;

    if (!allowedEmails[email]) {
      // Not an admin — sign out and show error
      await auth.signOut();
      error = 'Your account is not authorized. Ask an admin to add you.';
      loading = false;
      return;
    }

    // Session cookie is synced automatically by auth store
    onDialogClose();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Sign in failed';
    if (!msg.includes('popup-closed')) error = msg;
  } finally {
    loading = false;
  }
}
</script>

<dialog bind:this={dialogEl} class="modal" onclose={onDialogClose}>
  <div class="modal-box max-w-sm text-center">
    <form method="dialog">
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
    </form>
    <h3 class="text-lg font-bold mb-2">Sign In</h3>
    <p class="text-sm text-base-content/60 mb-6">Only invited admins can access the controls.</p>

    <button onclick={signInWithGoogle} disabled={loading} class="btn w-full gap-2">
      {#if loading}
        <span class="loading loading-spinner loading-xs"></span>
      {:else}
        <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      {/if}
      Continue with Google
    </button>

    {#if error}
      <p class="text-sm text-error mt-3">{error}</p>
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
