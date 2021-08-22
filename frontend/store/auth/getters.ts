import { getterTree } from 'typed-vuex';
import state from './state';

export default getterTree(state, {
  isActive: ({ status }): boolean => status === 'active',
});
