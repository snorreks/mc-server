import type { ServerStatusData } from '$config';
import { fromJsonData } from '$lib/client/transform';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ data }) => {
  return {
    status: data.status && fromJsonData<ServerStatusData>(data.status),
    billing: data.billing,
    serverInfo: data.serverInfo,
  };
};
