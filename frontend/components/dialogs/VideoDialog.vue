<template>
  <v-responsive :aspect-ratio="16 / 9">
    <vytia-player
      :ytid="videoId"
      width="100%"
      height="100%"
      :player-vars="{ autoplay: 1, playsinline: 1, showinfo: 0, controls: 0 }"
      @ended="$emit('ended')"
    />
  </v-responsive>
</template>

<script lang="ts">
import Vue from 'vue';
// @ts-ignore
import VuePlayerPlugin from 'vue-youtube-iframe-api';
Vue.use(VuePlayerPlugin);
const videoIds = [
  '4DPRNtQ3y_8',
  '6G7HYqjBxgg',
  'HHdNj5e6q1I',
  '9Vy-vCG06Aw',
  'FKBYWI3vqDA',
  '4JD7OqAdBhM',
  'xVQ6xMzu2pA',
  'OdEzrtQhOUI',
  'MB_Xq1Z-eZY',
  '-Kljmrtp9L8',
  'ed95gzdxzM0',
  'Ja3upeEG92Q',
  'qTTOWu4AqL8',
  'ZRNzwgQsQqE',
  'unveFSE-u14',
  'yrP43LB7QEQ',
  'n8A22Rcj-JE',
  'asoiGr0VZH4',
  '2aTzcIqYU-g',
  'RVIavddTEx0',
  'C8QXMNEYDDs',
  'FrZtZ1KgoQ0',
  'a0fLMPjBD_8',
  '2mtnregPwu8',
  'm9ODCOc1xXA',
  'dr5ly1im47A',
  'iBKjUyc0pEc',
  'ydrpx41-W8g',
  '-8vSa5Efgsw',
  'tHa52K9U4iU',
  '3NuLwOGMhp4',
  'owR4oDLFpuQ',
  'grnUX0glfME',
  'mb8eKf19Apk',
  'mvdGOzhWJIY',
  'pkejYQvkhso',
  'qGLk1GTg5Ns',
  'd538UZkBCQI',
  'AGvy8ZR7xPo',
  'UJb47GVgId8',
  'vPPuVek6vWU',
  'pp2cd3UoJP4',
  'EyKgQf22THg',
  'bmDdHk_X864',
  '-T9MF4LQG5I',
  'puBF96NL4HM',
  'f2f6OIh7f18',
  'f08Kuyb5GGc',
  'wGeT1HQmcCI',
  'dZStUzYE8Uw',
  'WX1gtQk6NaQ',
  'GWXXsxa2moA',
];

export default Vue.extend({
  name: 'VideoPlayer',
  data: () => ({
    videoId: videoIds[Math.floor(Math.random() * videoIds.length)],
  }),
});
</script>
