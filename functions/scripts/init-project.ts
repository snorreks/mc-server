// To execute: cd in to functions and type: "ts-node scripts/init-project.ts"

import fun from './config';

import { createUser } from '../src/controllers/user/createUser';

const init = async () => {
  try {
    await createUser({
      userForm: {
        email: 'snorrestrand@hotmail.com',
        username: 'yaboie',
        displayName: 'Snorre',
        password: '123456',
      },
    });
    await createUser({
      userForm: {
        email: 'jocute98@hotmail.com',
        username: 'jocute98',
        displayName: 'Joaboie',
        password: '123456',
      },
    });
    await fun.cleanup();
  } catch (e) {
    console.error(e);
  }

  process.exit();
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
init();
