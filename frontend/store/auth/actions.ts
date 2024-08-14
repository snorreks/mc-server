import { actionTree } from 'typed-vuex';
import getters from './getters';
import state from './state';
import mutations from './mutations';
export default actionTree(
  { getters, state, mutations },
  {
    onAuthStateChanged(
      { commit },
      {
        authUser,
        claims,
      }: {
        authUser: { uid: string; email: string; displayName?: string };
        claims: any;
      }
    ): void {
      if (!authUser) {
        return commit('setStatus', 'notSignedIn');
      }

      commit('setStatus', claims.isActive ? 'active' : 'notActive');
      commit('setUid', authUser.uid);
      commit('setEmail', authUser.email || '');
      commit('setDisplayName', authUser.displayName || '');
    },

    async signInWithEmail(
      { commit },
      { emailOrUsername, password, isEmail }
    ): Promise<boolean> {
      this.app.$accessor.start();
      try {
        let email = emailOrUsername;
        if (!isEmail) {
          const getEmailFromUsername = this.app.$fire.functions.httpsCallable(
            'auth_get_email_from_username'
          );
          const { data } = await getEmailFromUsername({
            username: emailOrUsername,
          });
          if (!data) {
            // Did not find any users with that username
            throw new Error('wrong_username');
          }
          email = data;
        }

        const userRes = await this.app.$fire.auth.signInWithEmailAndPassword(
          email,
          password
        );
        const user = userRes.user;
        if (!user) {
          this.app.$accessor.endWithError('No user');
          return false;
        }
        const tokenRes = await user.getIdTokenResult();
        const claims = tokenRes.claims;

        if (!claims.isActive) {
          this.app.$accessor.endWithError('You are not a AG Boie');
          await this.app.$fire.auth.signOut();
          return false;
        }

        this.app.$accessor.end();
        commit('setStatus', 'active');

        return true;
      } catch (e) {
        console.error('signInWithEmail', e);
        this.app.$accessor.endWithError(e.message);
        return false;
      }
    },
    async isUniqueUsername(_, { username }): Promise<boolean> {
      try {
        const getEmailFromUsername = this.app.$fire.functions.httpsCallable(
          'auth_get_email_from_username'
        );
        const { data } = await getEmailFromUsername({ username });
        return data === null;
      } catch (e) {
        return false;
      }
    },

    async signOut({ commit }): Promise<boolean> {
      try {
        await this.app.$fire.auth.signOut();
        commit('setStatus', 'notSignedIn');
        return true;
      } catch (e) {
        console.error('signOut', e);
        this.app.$accessor.endWithError(e.message);
        return false;
      }
    },
    async updatePassword(_, { oldPassword, newPassword }): Promise<boolean> {
      this.app.$accessor.start();
      try {
        const user = this.app.$fire.auth.currentUser;
        if (!user) {
          return false;
        }
        await this.app.$fire.auth.signInWithEmailAndPassword(
          user.email || '',
          oldPassword
        );
        await user.updatePassword(newPassword);
        this.app.$accessor.openNotification({
          text: 'Successfully updated password',
          color: 'success',
        });
        this.app.$accessor.end();
        return true;
      } catch (e) {
        console.error('updatePassword', e);
        this.app.$accessor.endWithError(e.message);
        return false;
      }
    },
    async sendResetPassword(_, { email }): Promise<string | null> {
      try {
        await this.app.$fire.auth.sendPasswordResetEmail(email);
        this.app.$accessor.openNotification({
          text: 'Successfully updated password',
          color: 'success',
        });
        return null;
      } catch (e) {
        console.error('sendResetPassword', e);
        return e.message;
      }
    },
  }
);
