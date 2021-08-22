<template>
  <v-card>
    <ValidationObserver
      ref="forgotPasswordFormObserver"
      v-slot="{ handleSubmit }"
    >
      <v-form @submit.prevent="handleSubmit(onSubmit)">
        <v-toolbar dark color="primary">
          <v-toolbar-title> Forgot password </v-toolbar-title>
          <v-spacer />
          <v-btn icon :disabled="loading" @click="onClose">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-alert
          v-model="error"
          transition="scale-transition"
          type="error"
          dismissible
          >{{ errorMessage }}</v-alert
        >
        <v-card-text>
          <ValidationProvider
            v-slot="{ errors }"
            name="Email"
            rules="required|email"
          >
            <v-text-field
              v-model="email"
              prepend-icon="mdi-email"
              label="Email"
              type="email"
              required
              :error-messages="errors"
              @keyup.enter.native="handleSubmit(onSubmit)"
            />
          </ValidationProvider>
        </v-card-text>
        <v-card-actions>
          <v-btn
            block
            :loading="loading"
            :disabled="loading"
            color="primary"
            type="submit"
            >Send reset link</v-btn
          >
        </v-card-actions>
        <v-card-actions>
          <v-btn block :disabled="loading" @click="onClose"> Cancel </v-btn>
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

import { required, email } from 'vee-validate/dist/rules';
setInteractionMode('lazy');
extend('required', required);
extend('email', email);

export default Vue.extend({
  components: {
    ValidationObserver,
    ValidationProvider,
  },
  data: () => ({
    email: '',
    errorMessage: '',
    loading: false,
  }),
  computed: {
    error: {
      get(): boolean {
        return this.errorMessage !== '';
      },
      set(v: boolean): void {
        if (!v) {
          this.errorMessage = '';
        }
      },
    },
    observer(): InstanceType<typeof ValidationObserver> {
      return this.$refs.forgotPasswordFormObserver as InstanceType<
        typeof ValidationObserver
      >;
    },
  },
  methods: {
    setForgotPasswordDialog(value: boolean): void {
      this.$accessor.setForgotPasswordDialog(value);
    },

    async onSubmit(): Promise<void> {
      this.loading = true;
      const errorMessage = await this.$accessor.auth.sendResetPassword({
        email: this.email,
      });
      this.loading = false;
      if (errorMessage === null) {
        this.onClose();
      } else {
        this.errorMessage = errorMessage;
      }
    },
    onClose(): void {
      this.observer.reset();
      this.email = '';
      this.errorMessage = '';
      this.setForgotPasswordDialog(false);
    },
  },
});
</script>
