import { getAccessorType, mutationTree, actionTree } from 'typed-vuex';
import { Context } from '@nuxt/types';
import { AppNotification } from '~/@types';
import * as auth from '~/store/auth';
import * as user from '~/store/user';
import * as preference from '~/store/preference';
import * as google from '~/store/google';

export const state = () => ({
  notification: {
    text: '',
    open: false,
    color: '',
  } as AppNotification,
  drawer: null as boolean | null,
  loading: false,
  appLoading: false,
  errorMessage: '',
  forgotPasswordDialog: false,
  changePasswordDialog: false,
});

export const mutations = mutationTree(state, {
  toggleDrawer(state) {
    state.drawer = !state.drawer;
  },
  setDrawer(state, payload: boolean) {
    state.drawer = payload;
  },
  setNotification(state, payload: AppNotification) {
    state.notification = payload;
  },
  setForgotPasswordDialog(state, payload: boolean) {
    state.forgotPasswordDialog = payload;
  },
  setChangePasswordDialog(state, payload: boolean) {
    state.changePasswordDialog = payload;
  },
  setLoading(state, payload: boolean) {
    state.loading = payload;
  },
  setAppLoading(state, payload: boolean) {
    state.appLoading = payload;
  },
  setError(state, payload: string) {
    state.errorMessage = payload;
  },
});

export const actions = actionTree(
  { state, mutations },
  {
    closeNotification({ commit }): void {
      commit('setNotification', {
        text: '',
        open: false,
        color: '',
      });
    },
    openNotification({ commit }, options): void {
      commit('setNotification', {
        text: options.text,
        open: true,
        color: options.color,
      });
    },
    start({ commit }): void {
      commit('setError', '');
      commit('setLoading', true);
    },
    endWithError({ commit }, errorMessage: string): void {
      commit('setLoading', false);
      commit('setError', errorMessage);
    },
    end({ commit }): void {
      commit('setLoading', false);
    },
    clearError({ commit }): void {
      commit('setError', '');
    },
    nuxtServerInit(_, { res }: Context): void {
      if (res && res.locals && res.locals.user) {
        const {
          allClaims: { companyId, isActive, userRole },
          uid,
          displayName,
          email,
        } = res.locals.user;
        return this.app.$accessor.auth.onAuthStateChanged({
          authUser: {
            uid,
            email: email as string,
            displayName: displayName || '',
          },
          claims: {
            companyId,
            isActive,
            userRole,
          },
        });
      }
    },
  }
);

export const accessorType = getAccessorType({
  mutations,
  state,
  actions,
  modules: {
    auth,
    preference,
    user,
    google,
  },
});
