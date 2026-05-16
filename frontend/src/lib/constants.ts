import { VM_HAS_MAP, VM_IP, VM_MAP_PORT } from '$config';

export const primaryColor = '#ff8300';
export const unixLabel = 'Unix';

export const ipAddress = VM_IP;
export const hasMap = VM_HAS_MAP;
export const mapPort = VM_MAP_PORT;
export const mapHref = hasMap ? `http://${ipAddress}:${mapPort}/` : undefined;
