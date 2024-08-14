/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import Vue from 'vue';
import type { MetaInfo as VueMetaInfo } from 'vue-meta';
import { accessorType } from '~/store';
type MetaInfo = VueMetaInfo;

declare module 'vue/types/vue' {
  interface Vue {
    $accessor: typeof accessorType;
  }
}

declare module 'vue/types/options' {
  interface ComponentOptions<V extends Vue> {
    head?: MetaInfo | (() => MetaInfo);
  }
}

declare module '@nuxt/types' {
  interface NuxtAppOptions {
    $accessor: typeof accessorType;
  }
}

declare module '*.vue' {
  export default Vue;
}
