import { json } from '@sveltejs/kit';
import { rconCommand } from '$lib/server/rcon';
import { logger } from '$logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const { command } = body;

    if (!command || typeof command !== 'string') {
      return json({ error: 'Command is required' }, { status: 400 });
    }

    // Basic sanitization — prevent obviously dangerous commands
    if (command.startsWith('stop') || command.startsWith('restart')) {
      return json({ error: 'Use the server controls for stop/restart' }, { status: 400 });
    }

    logger.info('rcon-console', `executing: ${command}`);

    const output = await rconCommand(command);

    logger.info('rcon-console', `output: ${output.slice(0, 300)}`);

    return json({ output });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('rcon-console', `failed: ${msg}`);
    return json({ error: msg }, { status: 500 });
  }
};
