import { CurrentUserStatus } from '~/@types';

export default () => ({
  status: 'notSignedIn' as CurrentUserStatus,
  uid: '',
  email: '',
  displayName: '',
});
