<template>
  <v-card>
    <v-toolbar dark color="primary">
      <v-toolbar-title> Login </v-toolbar-title>
      <v-spacer />
      <v-btn icon :disabled="loading" @click="onClose">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-toolbar>
    <lazy-error-alert />
    <ValidationObserver v-slot="{ handleSubmit }">
      <form submit.prevent>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <ValidationProvider
                  v-slot="{ errors }"
                  name="Email Or Username"
                  :rules="`required|${isEmail ? 'email' : 'alpha_dash|max:30'}`"
                >
                  <v-text-field
                    v-model="emailOrUsername"
                    prepend-icon="mdi-account"
                    label="Email/Username"
                    :type="isEmail ? 'email' : 'text'"
                    required
                    :error-messages="errors"
                  />
                </ValidationProvider>
              </v-col>
              <v-col cols="12">
                <ValidationProvider
                  v-slot="{ errors }"
                  name="Password"
                  rules="required|min:6"
                >
                  <v-text-field
                    v-model="password"
                    :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                    :type="showPassword ? 'text' : 'password'"
                    prepend-icon="mdi-lock"
                    label="Password"
                    required
                    :error-messages="errors"
                    @click:append="showPassword = !showPassword"
                    @keyup.enter.native="handleSubmit(onSubmit)"
                  />
                </ValidationProvider>
              </v-col>
            </v-row>
            <v-row justify="end">
              <v-btn text :disabled="loading" @click="openForgotPasswordDialog">
                Fogot Password
              </v-btn>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-btn
            block
            :loading="loading"
            :disabled="loading"
            color="primary"
            @click="handleSubmit(onSubmit)"
            >Login</v-btn
          >
        </v-card-actions>
      </form>
    </ValidationObserver>
    <v-dialog v-model="forgotPasswordDialog" persistent max-width="600">
      <lazy-forgot-password-dialog />
    </v-dialog>
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
import {
  required,
  email,
  // eslint-disable-next-line camelcase
  alpha_dash,
  min,
  max,
} from 'vee-validate/dist/rules';

setInteractionMode('lazy');

extend('required', {
  ...required,
  message: '{_field_} is required',
});

extend('email', {
  ...email,
  message: 'Invalid email',
});

extend('min', {
  ...min,
  message: 'Username must be longer than 6 characters',
});

extend('alpha_dash', {
  // eslint-disable-next-line camelcase
  ...alpha_dash,
  message: 'Invalid username',
});

extend('max', {
  ...max,
  message: 'Username must be less than 30 characters',
});

export default Vue.extend({
  components: {
    ValidationObserver,
    ValidationProvider,
  },
  data: () => ({
    emailOrUsername: '',
    password: '',
    showPassword: false,
    loading: false,
  }),
  computed: {
    isEmail(): boolean {
      return this.emailOrUsername.includes('@');
    },
    forgotPasswordDialog(): boolean {
      return this.$accessor.forgotPasswordDialog;
    },
  },
  methods: {
    openForgotPasswordDialog(): void {
      this.$accessor.setForgotPasswordDialog(true);
    },
    clearError(): void {
      this.$accessor.clearError();
    },
    onClose() {
      this.$emit('closeDialog');
      this.loading = false;
    },
    async onSubmit(): Promise<void> {
      this.loading = true;
      const resOk = await this.$accessor.auth.signInWithEmail({
        emailOrUsername: this.emailOrUsername,
        password: this.password,
        isEmail: this.isEmail,
      });
      if (resOk) {
        this.onClose();
      }
      this.loading = false;
    },
  },
});
</script>
