import type { NuxtConfig } from '@nuxt/types';
import { primaryColor } from './constants';

const isProductionMode = process.env.NODE_ENV === 'production';

const baseURL = isProductionMode
  ? 'https://ag-mc-server.web.app'
  : 'http://localhost:3000';

const nuxtConfig: NuxtConfig = {
  modern: true,
  ssr: false,
  target: 'static',
  components: [
    '~/components/app',
    '~/components/common',
    '~/components/dialogs',
    '~/components/forms',
  ],
  head: {
    title: 'AG Server',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        hid: 'description',
        name: 'description',
        content: 'The Minecraft AG Server PWA',
      },
    ],
  },

  loading: { color: primaryColor },

  buildModules: [
    '@nuxt/typescript-build',
    'nuxt-typed-vuex',
    '@nuxtjs/stylelint-module',
    '@nuxtjs/vuetify',
  ],
  modules: ['@nuxtjs/firebase', '@nuxtjs/pwa'],

  vuetify: {
    optionsPath: '~/plugins/vuetify.options.ts',
  },
  firebase: {
    onFirebaseHosting: true,
    config: {
      apiKey: 'AIzaSyBfYwD--6b7OnbTssvnxIHOZ6YR0c2HEBk',
      authDomain: 'mc-ag-server.firebaseapp.com',
      projectId: 'mc-ag-server',
      storageBucket: 'mc-ag-server.appspot.com',
      messagingSenderId: '486243071346',
      appId: '1:486243071346:web:c60da1fa60ff18af8d19eb',
      measurementId: 'G-M2J5SR86XV',
    },
    services: {
      functions: {
        location: 'europe-west3',
      },
      firestore: true,
      auth: {
        initialize: {
          onAuthStateChangedAction: 'auth/onAuthStateChanged',
        },
        ssr: false,
      },
    },
  },
  pwa: {
    meta: {
      name: 'AG Server',
      author: 'YaBoie',
      description: 'The Minecraft AG Server PWA',
      ogHost: baseURL,
      theme_color: primaryColor,
      nativeUI: true,
    },
    manifest: {
      theme_color: primaryColor,
      name: 'Minecraft AG Server PWA',
      short_name: 'AG Server',
      background_color: 'white',
      categories: ['minecraft'],
      description: 'The Minecraft AG Server PWA',
      dir: 'ltr',
      display: 'fullscreen',
      iarc_rating_id: '33c73596-29f7-4ced-a574-9f0b0573ca19',
      orientation: 'portrait-primary',
      start_Url: baseURL,
    },
  },
  build: {
    extend(config, { isClient, isDev }) {
      if (isClient && isDev) {
        config.devtool = isClient ? 'source-map' : 'inline-source-map';
      }
    },
  },
};

export default nuxtConfig;
