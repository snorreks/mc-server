import { actionTree } from 'typed-vuex';
import { set, keys, del } from 'idb-keyval';
import state from './state';
import mutations from './mutations';

const darkModeEnabledKey = '-dark_mode_enabled';
const promptPWAKey = '-prompt_pwa';

export default actionTree(
  { state, mutations },
  {
    async getPreferences({ commit }): Promise<void> {
      const storedKeys = await keys();

      for (const key of storedKeys) {
        switch (key) {
          case darkModeEnabledKey:
            commit('setDarkModeEnabled', true);
            if (this.app.vuetify) {
              this.app.vuetify.framework.theme.dark = true;
            }
            continue;
          case promptPWAKey:
            commit('setPromptPWA', false);
            continue;
        }
      }
    },
    async toggleDarkModeEnabled({ commit, state }): Promise<void> {
      try {
        const darkModeEnabled = !state.darkModeEnabled;
        commit('setDarkModeEnabled', darkModeEnabled);
        if (this.app.vuetify) {
          this.app.vuetify.framework.theme.dark = darkModeEnabled;
        }
        if (darkModeEnabled) {
          await set(darkModeEnabledKey, true);
        } else {
          await del(darkModeEnabledKey);
        }
      } catch (e) {
        console.error('toggleDarkModeEnabled', e);
      }
    },
    async disablePromptPWA({ commit }): Promise<void> {
      try {
        commit('setPromptPWA', false);
        await set(promptPWAKey, true);
      } catch (e) {
        console.error('disablePromptPWA', e);
      }
    },
  }
);
