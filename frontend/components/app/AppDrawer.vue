<template>
  <v-navigation-drawer v-model="drawer" fixed clipped app temporary>
    <v-list>
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title class="title">{{ displayName }}</v-list-item-title>
          <v-list-item-subtitle>{{ email }}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
      <v-divider />

      <v-list-item @click="showUserCreateDialog = true">
        <v-list-item-action>
          <v-icon>mdi-account-plus</v-icon>
        </v-list-item-action>
        <v-list-item-title>Add a user</v-list-item-title>
      </v-list-item>
    </v-list>

    <template #append>
      <v-divider />
      <v-list>
        <v-list-item @click="openChangePasswordDialog">
          <v-list-item-icon>
            <v-icon>mdi-lock-open</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Change password</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item @click="signOut">
          <v-list-item-icon>
            <v-icon>mdi-logout</v-icon>
          </v-list-item-icon>
          <v-list-item-action> Logout </v-list-item-action>
        </v-list-item>
      </v-list>
    </template>
    <v-dialog v-model="showUserCreateDialog" persistent max-width="600px">
      <lazy-user-form-dialog @closeDialog="showUserCreateDialog = false" />
    </v-dialog>
    <v-dialog v-model="changePasswordDialog" persistent max-width="600px">
      <lazy-change-password-dialog />
    </v-dialog>
  </v-navigation-drawer>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
  data: () => ({
    showUserCreateDialog: false,
  }),
  computed: {
    displayName(): string {
      return this.$accessor.auth.displayName || '';
    },
    email(): string {
      return this.$accessor.auth.email || '';
    },
    changePasswordDialog(): boolean {
      return this.$accessor.changePasswordDialog;
    },
    drawer: {
      get(): boolean | null {
        return this.$accessor.drawer;
      },
      set(value: boolean): void {
        return this.$accessor.setDrawer(value);
      },
    },
  },
  methods: {
    async signOut(): Promise<void> {
      await this.$accessor.auth.signOut();
    },
    openChangePasswordDialog(): void {
      this.$accessor.setChangePasswordDialog(true);
    },
  },
});
</script>
