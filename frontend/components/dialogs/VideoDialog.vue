<template>
  <v-responsive :aspect-ratio="16 / 9">
    <vytia-player
      :ytid="videoId"
      width="100%"
      height="100%"
      :player-vars="{ autoplay: 1, playsinline: 1, showinfo: 0, controls: 0 }"
      @ended="$emit('ended')"
      @error="$emit('ended')"
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
  'tyQYCGTNREk',
  'uhoNez4F4vc',
  'G17SbQv7OM4',
  '58aXCqdgjBE',
  'xxB4TDU829c',
  '1e6b5dBGmfs',
  'o5m65DWY0wo',
  'L48ydu8BB04',
  '784yJnn7pj8',
  'CqmMJV3LALo',
  'zFIBHnyF7VQ',
  'WwdQP3s6Dko',
  'v9-Oq8R_1DQ',
  'Yf_-FxFBt4I',
  'rzP_NqMVOj4',
  '-87MqGhLQmk',
  'TFWje5JJn7c',
  'NM2YmYuGTBU',
  'qGKxVCFQX-Q',
  'zIDvcWwKOJE',
  '70eJlWh48s8',
  'ILcbpzacVdQ',
  'H9LWYW3sgrI',
  'PQfXLFzircU',
  'H8ZUKMo75xs',
  'uSrhV6Dxwb4',
  '0CPYWJIT4io',
  'rqt9hdZwyY4',
  '7TuTS7GzhxA',
  'zqcWOvAJl4A',
  'STKTdk9d8D4',
  'rLe6Ip6hU3I',
  '-abNj3Imno8',
  'pZMP6DwdZlY',
  'oGu_Rwc_Hv4',
  '-RtfmcO3Wzo',
  't9n1Orq7rq0',
  'zGcwaMbc0P8',
  'tYBNx6fvIUo',
  'BW6LW4Gh9lc',
  'VXArZvLgCXs',
  'aavJx2_m8VU',
  'QOtLF0tYVW8',
  '-976TfIvJ1s',
  'qs0YyGGei_4',
  'Ruymeps9RwU',
  'x_o06lSsGIw',
  'VYzApyviTt8',
  'i4cnP3j5N1g',
  'TQdZUdsXYwQ',
  'tKDlPqJxC48',
  '6A4jv7qpFFk',
  'wm41xMaSiiM',
  '_M5epU53h_8',
  'OI4xDq2n8q0',
  'g8MUBBfP8mk',
  'Vl07iNvN9g0',
  '7vm_y72rCTk',
  'NtUTmuN2TXo',
  'Y4Fes8Up1tA',
  'r2ErsDrM1Lg',
];

export default Vue.extend({
  name: 'VideoPlayer',
  data: () => ({
    videoId: videoIds[Math.floor(Math.random() * videoIds.length)],
  }),
});
</script>
