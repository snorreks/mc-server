<template>
  <v-overlay :value="appLoading">
    <v-progress-circular :size="70" :width="7" color="primary" indeterminate />
  </v-overlay>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
  name: 'AppLoading',
  computed: {
    appLoading(): boolean {
      return this.$accessor.appLoading;
    },
  },
});
</script>
