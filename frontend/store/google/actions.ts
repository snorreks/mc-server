import { actionTree } from 'typed-vuex';

export default actionTree(
  { state: () => ({}) },
  {
    async stopServer(_): Promise<boolean> {
      this.app.$accessor.setAppLoading(true);
      try {
        const callable = this.app.$fire.functions.httpsCallable('vm');
        await callable({ type: 'stop' });

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
        const callable = this.app.$fire.functions.httpsCallable('vm');
        await callable({ type: 'start' });

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
        const callable = this.app.$fire.functions.httpsCallable('vm');
        await callable({ type: 'check' });
        this.app.$accessor.end();

        return true;
      } catch (e) {
        console.error('checkServerStatus', e);
        this.app.$accessor.endWithError(e.message);
        return false;
      }
    },
    async delayShutdown(_): Promise<boolean> {
      this.app.$accessor.start();
      try {
        const callable = this.app.$fire.functions.httpsCallable('vm');
        await callable({ type: 'delay' });
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
