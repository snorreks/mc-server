<template>
  <v-row class="fill-height" align="center" justify="center">
    <v-card class="pa-2">
      <v-card-text class="text-center">
        <h1 class="text-h3 my-12">
          {{ errorMessage }}
        </h1>
        <v-btn class="text-h5 primary" @click="refresh"> Home page </v-btn>
      </v-card-text>
    </v-card>
  </v-row>
</template>

<script lang="ts">
import Vue from 'vue';
import type { PropOptions, MetaInfo } from '~/@types';
interface LayoutError {
  statusCode: number;
  message: string;
}

export default Vue.extend({
  props: {
    error: {
      type: Object,
      default: () => {},
    } as PropOptions<LayoutError>,
  },
  data: () => ({
    pageNotFound: '404 Not Found',
    otherError: 'An error occurred',
  }),
  head(): MetaInfo {
    return {
      title:
        this.error.statusCode === 404 ? this.pageNotFound : this.otherError,
    };
  },
  computed: {
    errorMessage(): string {
      return this.error.statusCode === 404
        ? this.pageNotFound
        : this.otherError;
    },
  },
  methods: {
    refresh(): void {
      this.$router.go(0);
    },
  },
});
</script>
