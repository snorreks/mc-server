<template>
  <v-banner v-if="deferredPrompt" app icon-color="primary" icon="mdi-monitor">
    Install the PWA on your computer or mobile.
    <template #actions="{ dismiss }">
      <v-btn text color="primary" @click="close(dismiss)"> Close </v-btn>
      <v-btn text color="primary" @click="install"> Install </v-btn>
    </template>
  </v-banner>
</template>

<script lang="ts">
import Vue from 'vue';
import { BeforeInstallPromptEvent } from '~/@types';

export default Vue.extend({
  name: 'AppBaner',
  data: () => ({
    deferredPrompt: null as BeforeInstallPromptEvent | null,
  }),
  computed: {
    promptPWA(): boolean {
      return this.$accessor.preference.promptPWA;
    },
  },
  beforeMount(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      if (this.promptPWA) {
        this.deferredPrompt = e as BeforeInstallPromptEvent;
      }
    });
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
    });
  },
  methods: {
    close(dismiss: () => void): void {
      this.$accessor.preference.disablePromptPWA();
      dismiss();
    },
    install(): void {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
      }
    },
  },
});
</script>
