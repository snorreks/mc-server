<template>
  <v-card>
    <ValidationObserver
      ref="changePasswordFormObserver"
      v-slot="{ handleSubmit }"
    >
      <v-form @submit.prevent="handleSubmit(onSubmit)">
        <v-toolbar dark color="primary">
          <v-toolbar-title>Change Password</v-toolbar-title>
          <v-spacer />
          <v-btn icon @click="onClose">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <lazy-error-alert />
        <v-card-text>
          <v-container>
            <v-row no-gutters>
              <v-col cols="12">
                <ValidationProvider
                  v-slot="{ errors }"
                  name="oldPassword"
                  rules="required|min:6"
                >
                  <v-text-field
                    v-model="oldPassword"
                    :append-icon="showOldPassword ? 'mdi-eye' : 'mdi-eye-off'"
                    :type="showOldPassword ? 'text' : 'password'"
                    prepend-icon="mdi-lock"
                    label="Old Password"
                    required
                    :error-messages="errors"
                    @click:append="showOldPassword = !showOldPassword"
                  />
                </ValidationProvider>
              </v-col>
              <v-col cols="12">
                <ValidationProvider
                  v-slot="{ errors }"
                  name="newPassword"
                  rules="required|min:6"
                >
                  <v-text-field
                    v-model="newPassword"
                    :append-icon="showNewPassword ? 'mdi-eye' : 'mdi-eye-off'"
                    :type="showNewPassword ? 'text' : 'password'"
                    prepend-icon="mdi-lock"
                    label="New Password"
                    required
                    :error-messages="errors"
                    @click:append="showNewPassword = !showNewPassword"
                  />
                </ValidationProvider>
              </v-col>
              <v-col cols="12">
                <ValidationProvider
                  v-slot="{ errors }"
                  name="confirmNewPassword"
                  rules="required|min:6|confirmed:newPassword"
                >
                  <v-text-field
                    v-model="confirmNewPassword"
                    :append-icon="
                      showConfirmNewPassword ? 'mdi-eye' : 'mdi-eye-off'
                    "
                    :type="showConfirmNewPassword ? 'text' : 'password'"
                    prepend-icon="mdi-lock"
                    label="Confirm New Password"
                    required
                    :error-messages="errors"
                    @click:append="
                      showConfirmNewPassword = !showConfirmNewPassword
                    "
                  />
                </ValidationProvider>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>

        <v-card-actions>
          <v-btn
            block
            :loading="loading"
            :disabled="loading"
            color="primary"
            type="submit"
            >Change</v-btn
          >
        </v-card-actions>
        <v-card-actions>
          <v-btn block :disabled="loading" @click="onClose">Cancel</v-btn>
        </v-card-actions>
      </v-form>
    </ValidationObserver>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue';
import {
  ValidationObserver,
  ValidationProvider,
  setInteractionMode,
  extend,
} from 'vee-validate';

import { required, min, confirmed } from 'vee-validate/dist/rules';
setInteractionMode('lazy');
extend('required', required);
extend('min', min);
extend('confirmed', confirmed);

export default Vue.extend({
  components: {
    ValidationProvider,
    ValidationObserver,
  },
  data: () => ({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    showOldPassword: false,
    showNewPassword: false,
    showConfirmNewPassword: false,
  }),
  computed: {
    observer(): InstanceType<typeof ValidationObserver> {
      return this.$refs.changePasswordFormObserver as InstanceType<
        typeof ValidationObserver
      >;
    },
    loading(): boolean {
      return this.$accessor.loading;
    },
  },

  methods: {
    setPasswordDialog(v: boolean): void {
      this.$accessor.setChangePasswordDialog(v);
    },
    clearError(): void {
      this.$accessor.clearError();
    },
    async onSubmit(): Promise<void> {
      const resOk = await this.$accessor.auth.updatePassword({
        oldPassword: this.oldPassword,
        newPassword: this.newPassword,
      });
      if (resOk) {
        this.onClose();
      }
    },
    onClose(): void {
      this.observer.reset();
      this.oldPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
      this.showOldPassword = false;
      this.showNewPassword = false;
      this.showConfirmNewPassword = false;
      this.clearError();
      this.setPasswordDialog(false);
    },
  },
});
</script>
