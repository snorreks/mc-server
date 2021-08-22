<template>
  <v-app-bar fixed clipped-left app elevate-on-scroll>
    <v-app-bar-nav-icon v-if="isActive" @click="changeSideBar" />
    <v-toolbar-title class="title">
      <v-avatar>
        <v-img :src="iconPath" />
      </v-avatar>
      AG Server
    </v-toolbar-title>

    <v-spacer />
    <v-dialog v-if="!isActive" v-model="loginFormDialog" width="800">
      <template #activator="{ on, attrs }">
        <v-btn text v-bind="attrs" v-on="on">
          <v-icon left> mdi-login </v-icon>
          Login
        </v-btn>
      </template>
      <LazyLoginForm @closeDialog="loginFormDialog = false" />
    </v-dialog>

    <v-btn icon @click="toggleDarkMode">
      <v-icon>mdi-theme-light-dark</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
  name: 'AppBar',
  data: () => ({
    loginFormDialog: false,
  }),
  computed: {
    isActive(): boolean {
      return this.$accessor.auth.isActive;
    },
    iconPath(): string {
      return require('~/static/icon.png');
    },
  },
  methods: {
    changeSideBar(): void {
      this.$accessor.toggleDrawer();
    },
    toggleDarkMode(): void {
      this.$accessor.preference.toggleDarkModeEnabled();
    },
  },
});
</script>
