import { mutationTree } from 'typed-vuex';
import state from './state';

export default mutationTree(state, {
  setDarkModeEnabled(state, payload: boolean) {
    state.darkModeEnabled = payload;
  },
  setPromptPWA(state, payload: boolean) {
    state.promptPWA = payload;
  },
});
