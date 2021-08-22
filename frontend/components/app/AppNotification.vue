<template>
  <v-snackbar
    v-model="appNotification"
    :timeout="4000"
    :color="notification.color"
    top
    left
  >
    {{ notification.text }}

    <template #action="{ attrs }">
      <v-btn text v-bind="attrs" @click="closeNotification"> Close </v-btn>
    </template>
  </v-snackbar>
</template>

<script lang="ts">
import Vue from 'vue';
import { AppNotification } from '~/@types';
export default Vue.extend({
  computed: {
    notification(): AppNotification {
      return this.$accessor.notification;
    },
    appNotification: {
      get(): boolean {
        return this.notification.open;
      },
      set(_value): void {
        this.closeNotification();
      },
    },
  },
  methods: {
    closeNotification(): void {
      this.$accessor.closeNotification();
    },
  },
});
</script>
