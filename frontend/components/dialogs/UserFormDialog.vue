<template>
  <ValidationObserver ref="userFormObserver" v-slot="{ handleSubmit }">
    <v-form @submit.prevent="handleSubmit(onSubmit)">
      <v-card>
        <v-toolbar dark color="primary">
          <v-toolbar-title>
            {{ 'Add new user' }}
          </v-toolbar-title>
          <v-spacer />
          <v-btn icon :disabled="loading" @click="onClose">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <lazy-error-alert />
        <v-card-text>
          <v-container>
            <v-row no-gutters>
              <v-col cols="6">
                <ValidationProvider
                  v-slot="{ errors, valid }"
                  name="Email"
                  rules="required|email"
                >
                  <v-text-field
                    v-model="user.email"
                    prepend-icon="mdi-email"
                    label="Email"
                    :success="valid"
                    type="email"
                    :error-messages="errors"
                  />
                </ValidationProvider>
              </v-col>

              <v-col cols="6">
                <ValidationProvider
                  v-slot="{ errors, valid }"
                  name="Password"
                  rules="required|min:6"
                >
                  <v-text-field
                    v-model="user.password"
                    prepend-icon="mdi-lock"
                    label="Password"
                    type="password"
                    :success="valid"
                    :error-messages="errors"
                  />
                </ValidationProvider>
              </v-col>

              <v-col cols="12">
                <v-divider />
                <v-subheader> Optional </v-subheader>
              </v-col>

              <v-col cols="6">
                <ValidationProvider
                  v-slot="{ errors, valid }"
                  ref="username"
                  name="Username"
                  rules="alpha_dash|max:30|uniqueUsername"
                >
                  <v-text-field
                    v-model="user.username"
                    :success="valid"
                    :loading="checkingUsername"
                    prepend-icon="mdi-account"
                    label="Username"
                    required
                    :error-messages="errors"
                    @blur="checkUsername"
                  />
                </ValidationProvider>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="user.displayName"
                  success
                  prepend-icon="mdi-badge-account-horizontal"
                  label="Display Name"
                />
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
            >Add</v-btn
          >
        </v-card-actions>
        <v-card-actions>
          <v-btn block :disabled="loading" @click="onClose">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </ValidationObserver>
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
  min,
  email,
  // eslint-disable-next-line camelcase
  alpha_dash,
  max,
} from 'vee-validate/dist/rules';

setInteractionMode('lazy');

setInteractionMode('lazy');
extend('required', required);
extend('email', email);
extend('min', min);
extend('max', max);
// eslint-disable-next-line camelcase
extend('alpha_dash', alpha_dash);

export default Vue.extend({
  components: {
    ValidationObserver,
    ValidationProvider,
  },

  data: () => ({
    user: {
      email: '',
      username: '',
      displayName: '',
      password: '',
    },
    prevUsername: '',
    checkingUsername: false,
    uniqueUsername: false,
  }),
  computed: {
    observer(): InstanceType<typeof ValidationObserver> {
      return this.$refs.userFormObserver as InstanceType<
        typeof ValidationObserver
      >;
    },
    loading(): boolean {
      return this.$accessor.loading;
    },
    userFormDialog(): boolean {
      return this.$accessor.userFormDialog;
    },
    authRole(): { text: string; value: string }[] {
      return [
        { text: 'Admin', value: 'admin' },
        { text: 'Manager', value: 'manager' },
        {
          text: 'Uploader',
          value: 'uploader',
        },
        {
          text: 'Member',
          value: 'member',
        },
      ];
    },
  },
  created(): void {
    extend('uniqueUsername', () => {
      if (this.checkingUsername || this.uniqueUsername) {
        return true;
      } else {
        return 'The username already exists';
      }
    });
  },

  methods: {
    async checkUsername(): Promise<void> {
      if (!this.user.username || this.user.username === this.prevUsername) {
        return;
      }
      this.checkingUsername = true;
      this.prevUsername = this.user.username;
      this.uniqueUsername = await this.$accessor.auth.isUniqueUsername({
        username: this.user.username,
      });
      this.checkingUsername = false;
      await (
        this.$refs.username as InstanceType<typeof ValidationProvider>
      ).validate();
    },
    clearError(): void {
      this.$accessor.clearError();
    },
    async onSubmit(): Promise<void> {
      const user = this.user;

      const resOk = await this.$accessor.user.createUser({
        userForm: user,
      });
      if (resOk) {
        this.onClose();
      }
    },
    onClose(): void {
      this.$emit('closeDialog');
      this.clearError();
      this.observer.reset();
      this.user = {
        email: '',
        username: '',
        displayName: '',
        password: '',
      };
    },
  },
});
</script>
