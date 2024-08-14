<template>
  <v-container fluid>
    <v-container>
      <v-row>
        <v-col cols="12" class="text-h2 text-center">
          AG Minecraft Server
        </v-col>

        <v-col cols="12">
          <v-card>
            <v-list v-if="serverStatus" subheader>
              <v-subheader>Sever Status</v-subheader>
              <v-list-item :color="serverIsOn ? 'success' : 'error'">
                <v-list-item-icon>
                  <v-icon :color="serverIsOn ? 'success' : 'error'">
                    {{ serverIsOn ? 'mdi-server' : 'mdi-server-network-off' }}
                  </v-icon>
                </v-list-item-icon>

                <v-list-item-content>
                  <v-list-item-title>The server is:</v-list-item-title>
                  <v-list-item-subtitle>{{ status }}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>

              <v-list-item>
                <v-list-item-icon>
                  <v-icon> mdi-update </v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>Last checked</v-list-item-title>
                  <v-list-item-subtitle>{{ lastChecked }}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>

              <v-list-item v-if="serverIsOn">
                <v-list-item-icon>
                  <v-icon :color="skipNextAutoShutdown ? 'green' : 'red'">
                    {{
                      skipNextAutoShutdown ? 'mdi-calendar-check' : 'mdi-clock'
                    }}
                  </v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>
                    {{
                      skipNextAutoShutdown
                        ? 'The server will not shutdown at 6 am'
                        : 'The server will shutdown at 6 am'
                    }}
                  </v-list-item-title>
                </v-list-item-content>
              </v-list-item>

              <v-list-item v-if="!serverIsOn">
                <v-list-item-icon>
                  <v-icon> mdi-calendar-clock </v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>Last online</v-list-item-title>
                  <v-list-item-subtitle>{{ lastOnline }}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <v-btn
          class="my-2"
          block
          color="primary"
          :disabled="checkingServerStatus"
          :loading="checkingServerStatus"
          @click="checkServerStatus"
        >
          Check Server Status
        </v-btn>
        <v-btn
          v-if="isActive && !serverIsOn"
          class="my-2"
          block
          color="success"
          @click="startServer"
        >
          Start Server
        </v-btn>

        <v-btn
          v-if="isActive && serverIsOn"
          class="my-2"
          block
          color="success"
          @click="delayShutdown"
        >
          Delay shutdown
        </v-btn>

        <v-btn
          v-if="isActive && serverIsOn"
          class="my-2"
          block
          color="error"
          @click="stopServer"
        >
          Stop Server
        </v-btn>

        <v-btn v-if="isActive" class="my-2" block @click="openBackupDialog">
          Open Backups Dialog
        </v-btn>

        <v-tooltip v-model="showCopyTooltip" bottom>
          <template #activator="{ attrs }">
            <v-btn class="my-2" block v-bind="attrs" @click="copyIP">
              Copy the Server IP: {{ ipAddress }}
            </v-btn>
          </template>
          <span>IP Copied</span>
        </v-tooltip>

        <v-btn
          v-if="hasMap"
          class="my-2"
          block
          :disabled="!serverIsOn"
          color="info"
          :href="mapHref"
          target="_blank"
        >
          <v-icon>mdi-map</v-icon>
          View map
        </v-btn>
      </v-row>

      <v-dialog v-model="showVideoDialog" width="1023" height="725">
        <LazyVideoDialog
          v-if="showVideoDialog"
          @ended="showVideoDialog = false"
        />
      </v-dialog>

      <v-dialog v-model="showBackupsDialog" width="1023" height="725">
        <LazyBackupsDialog
          v-if="showBackupsDialog"
          @close="showBackupsDialog = false"
        />
      </v-dialog>
    </v-container>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue';
import { SnapShotListener } from '~/@types';
import { ipAddress, hasMap, mapIpAddress } from '~/constants';
import { toCalendar } from '~/utils';

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export default Vue.extend({
  data: () => ({
    serverStatus: null as any | null,
    serverListener: null as SnapShotListener | null,
    checkingServerStatus: false,
    showCopyTooltip: false,
    showVideoDialog: false,
    showBackupsDialog: false,
    ipAddress,
    hasMap,
  }),
  computed: {
    isActive(): boolean {
      return this.$accessor.auth.isActive;
    },
    serverIsOn(): boolean {
      return this.serverStatus?.serverIsOn;
    },
    status(): string {
      return this.serverStatus?.serverStatus;
    },
    skipNextAutoShutdown(): boolean {
      return this.serverStatus?.skipNextAutoShutdown;
    },
    lastOnline(): string | undefined {
      if (this.serverStatus.lastOnline) {
        return toCalendar(this.serverStatus?.lastOnline.toDate() as Date);
      } else {
        return undefined;
      }
    },
    lastChecked(): string | undefined {
      if (this.serverStatus.updatedAt) {
        return toCalendar(this.serverStatus?.updatedAt.toDate() as Date);
      } else {
        return undefined;
      }
    },
    mapHref(): string {
      return `http://${ipAddress}:${mapIpAddress}/`;
    },
  },
  created(): void {
    this.serverListener = this.$fire.firestore
      .collection('status')
      .doc('ag-server')
      .onSnapshot((snapshotChange) => {
        this.serverStatus = snapshotChange.data();
      });
  },
  methods: {
    async checkServerStatus(): Promise<void> {
      this.spinTheWheel();
      this.checkingServerStatus = true;
      await this.$accessor.google.checkServerStatus();
      this.checkingServerStatus = false;
    },
    async startServer(): Promise<void> {
      this.spinTheWheel();
      await this.$accessor.google.startServer();
    },
    async copyIP(): Promise<void> {
      navigator.clipboard.writeText(this.ipAddress);
      this.spinTheWheel();

      this.showCopyTooltip = true;
      await delay(1000);
      this.showCopyTooltip = false;
    },
    async stopServer(): Promise<void> {
      this.spinTheWheel();
      await this.$accessor.google.stopServer();
    },
    openBackupDialog(): void {
      this.showBackupsDialog = true;
    },
    delayShutdown(): void {
      this.spinTheWheel();
      this.$accessor.google.delayShutdown();
    },

    spinTheWheel(): void {
      if (Math.random() < 0.5) {
        this.showVideoDialog = true;
      }
    },
  },
});
</script>
