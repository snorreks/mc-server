import { actionTree } from 'typed-vuex';

export default actionTree(
  { state: () => ({}) },
  {
    async stopServer(_): Promise<boolean> {
      this.app.$accessor.setAppLoading(true);
      try {
        const stopServer = this.app.$fire.functions.httpsCallable('stopServer');
        await stopServer({});

        this.app.$accessor.setAppLoading(false);
        this.app.$accessor.openNotification({
          text: 'Successfully stopped the server!',
          color: 'success',
        });
        return true;
      } catch (e) {
        console.error('stopServer', e);
        this.app.$accessor.setAppLoading(false);
        this.app.$accessor.endWithError(e.message);
        return false;
      }
    },
    async startServer(_): Promise<boolean> {
      this.app.$accessor.setAppLoading(true);
      try {
        const startServer =
          this.app.$fire.functions.httpsCallable('startServer');
        await startServer({});

        this.app.$accessor.setAppLoading(false);
        this.app.$accessor.openNotification({
          text: 'Successfully started the server!',
          color: 'success',
        });
        return true;
      } catch (e) {
        console.error('stopServer', e);
        this.app.$accessor.setAppLoading(false);
        this.app.$accessor.endWithError(e.message);
        return false;
      }
    },
    async checkServerStatus(_): Promise<boolean> {
      this.app.$accessor.start();
      try {
        const checkServerStatus =
          this.app.$fire.functions.httpsCallable('checkServerStatus');
        await checkServerStatus({});
        this.app.$accessor.end();

        return true;
      } catch (e) {
        console.error('checkServerStatus', e);
        this.app.$accessor.endWithError(e.message);
        return false;
      }
    },
  }
);
