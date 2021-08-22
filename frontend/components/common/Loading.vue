<template>
  <v-container
    fill-height
    :style="`height: 100px; min-height: ${
      $vuetify.breakpoint.height - 175
    }px; display:flex; flex-direction: column;`"
  >
    <v-row align="center" justify="center">
      <v-progress-circular color="primary" indeterminate />
    </v-row>
  </v-container>
</template>
