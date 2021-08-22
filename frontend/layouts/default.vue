<template>
  <v-app>
    <LazyAppLoading />
    <LazyAppNotification />
    <AppBar />
    <LazyAppDrawer v-if="isActive" />
    <v-main>
      <LazyAppBanner />
      <nuxt />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
  name: 'AppBaner',
  fetch(): void {
    this.$accessor.preference.getPreferences();
  },
  computed: {
    isActive(): boolean {
      return this.$accessor.auth.isActive;
    },
  },
});
</script>
