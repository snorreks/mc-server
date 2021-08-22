import { catchErrors } from '../../utils/functionHelpers';
import { checkServerStatus } from './utils';

export default async (): Promise<void> => {
  return catchErrors(checkServerStatus());
};
