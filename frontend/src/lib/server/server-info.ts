import {
  GCP_FREE_TIER_CREDITS,
  MC_FORGE_VERSION,
  MC_JVM_OPTS,
  MC_MACHINE_TYPE,
  MC_MEMORY,
  MC_MODPACK_NAME,
  MC_MODPACK_URL,
  MC_TYPE,
  MC_VERSION,
  PROJECT_ID,
  USD_TO_NOK_RATE,
} from '$config';

export type ServerInfo = {
  max: number;
  difficulty: string;
  viewDistance: number;
  gamemode: string;
  // Static config (not from RCON)
  memory: string;
  version: string;
  forgeVersion: string;
  type: string;
  modpackName: string;
  modpackUrl: string;
  machineType: string;
  jvmOpts: string;
  projectId: string;
  freeTrialLimit: number;
  usdToNokRate: number;
};

export async function getServerInfo(): Promise<ServerInfo> {
  return {
    max: 30,
    difficulty: 'hard',
    viewDistance: 14,
    gamemode: 'survival',
    // Static config
    memory: MC_MEMORY,
    version: MC_VERSION,
    forgeVersion: MC_FORGE_VERSION,
    type: MC_TYPE,
    modpackName: MC_MODPACK_NAME,
    modpackUrl: MC_MODPACK_URL,
    machineType: MC_MACHINE_TYPE,
    jvmOpts: MC_JVM_OPTS,
    projectId: PROJECT_ID,
    freeTrialLimit: GCP_FREE_TIER_CREDITS,
    usdToNokRate: USD_TO_NOK_RATE,
  };
}
