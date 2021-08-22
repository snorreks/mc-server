import { mutationTree } from 'typed-vuex';
import state from './state';
import { CurrentUserStatus } from '~/@types';

export default mutationTree(state, {
  setUid(state, payload: string) {
    state.uid = payload;
  },
  setEmail(state, payload: string) {
    state.email = payload;
  },
  setDisplayName(state, payload: string) {
    state.displayName = payload;
  },
  setStatus(state, payload: CurrentUserStatus) {
    state.status = payload;
  },
});
