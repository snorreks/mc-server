import { actionTree } from 'typed-vuex';

export default actionTree(
  { state: () => ({}) },
  {
    async createUser(_, { userForm }: { userForm: any }): Promise<boolean> {
      this.app.$accessor.start();
      try {
        const createUser =
          this.app.$fire.functions.httpsCallable('auth_create_user');
        await createUser({ userForm });

        this.app.$accessor.end();
        this.app.$accessor.openNotification({
          text: 'Successfully created the user!',
          color: 'success',
        });
        return true;
      } catch (e) {
        console.error('createUser', e);
        this.app.$accessor.endWithError(e.message);
        return false;
      }
    },
  }
);
