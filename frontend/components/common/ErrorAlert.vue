<template>
  <v-alert
    v-model="error"
    transition="scale-transition"
    type="error"
    dismissible
    >{{ errorMessage }}</v-alert
  >
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
  computed: {
    error: {
      get(): boolean {
        return this.$accessor.errorMessage !== '';
      },
      set(v: boolean): void {
        if (!v) {
          return this.$accessor.clearError();
        }
      },
    },
    errorMessage(): string {
      return this.$accessor.errorMessage;
    },
  },
});
</script>
