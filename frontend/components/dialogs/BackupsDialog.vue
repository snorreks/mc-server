<template>
  <v-card>
    <v-card-title>
      <span class="headline">Backup List</span>
      <v-spacer></v-spacer>
      <v-btn icon @click="$emit('close')">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text>
      <v-progress-linear v-if="loading" indeterminate></v-progress-linear>
      <v-list v-else class="scrollable-list">
        <v-list-item
          v-for="(backup, index) in sortedBackups"
          :key="index"
          @click="downloadBackup(backup)"
        >
          <v-list-item-content>
            <v-list-item-title>{{ backup.name }}</v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>
            <v-btn icon @click="downloadBackup(backup)">
              <v-icon>mdi-download</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue';
import { BackupData } from '~/@types';

export default Vue.extend({
  name: 'VideoPlayer',
  data: () => ({
    backups: [] as BackupData[],
    loading: true,
  }),
  computed: {
    sortedBackups(): BackupData[] {
      return this.backups
        .map((backup) => ({
          ...backup,
          name: backup.name.replace('.tar.gz', ''),
          date: this.parseBackupDate(backup.name.replace('.tar.gz', '')),
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    },
  },
  async mounted() {
    this.loading = true;
    const backups = await this.$accessor.storage.listBackups();
    console.log(backups);
    this.backups = backups;
    this.loading = false;
  },
  methods: {
    parseBackupDate(name: string): Date {
      const [datePart, timePart] = name.split('_');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      return new Date(year, month - 1, day, hour, minute);
    },
    async downloadBackup(backup: BackupData) {
      try {
        const url = await backup.getDownloadURL();
        const link = document.createElement('a');
        link.href = url;
        link.download = backup.name;
        link.click();
      } catch (error) {
        console.error('Error downloading backup:', error);
      }
    },
  },
});
</script>

<style scoped>
.headline {
  font-weight: bold;
}
.scrollable-list {
  max-height: 400px;
  overflow-y: auto;
}
</style>
