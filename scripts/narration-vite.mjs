import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';

const origin = 'http://127.0.0.1:8765';
export const narrationProxy = { '/api/narration': { target: origin, proxyTimeout: 600_000, timeout: 600_000 } };

/** Start the local model service only when Listen is used, in dev or preview. */
export function narrationService(root) {
  let starting = null;
  const health = async () => {
    try {
      const response = await fetch(`${origin}/api/narration/health`, { signal: AbortSignal.timeout(1000) });
      if (!response.ok) return false;
      return (await response.json()).model === 'mlx-community/chatterbox-multilingual-v3';
    } catch { return false; }
  };
  async function ensure() {
    if (await health()) return;
    if (!starting) starting = (async () => {
      const python = resolve(root, '.venv-narration/bin/python');
      if (!existsSync(python)) throw new Error('Run npm run narration:setup before starting narration.');
      mkdirSync(resolve(root, '.cache/narration'), { recursive: true });
      const log = openSync(resolve(root, '.cache/narration/service.log'), 'a');
      const child = spawn(python, [resolve(root, 'scripts/narration-server.py'), '--port', '8765'], {
        cwd: root, detached: true, stdio: ['ignore', log, log], env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });
      closeSync(log);
      let failure = null;
      child.on('error', (error) => { failure = error; });
      child.unref();
      for (let i = 0; i < 120; i++) {
        if (failure) throw failure;
        if (child.exitCode != null) throw new Error('Narration service exited during startup.');
        if (await health()) return;
        await new Promise((done) => setTimeout(done, 250));
      }
      throw new Error('Narration service startup timed out.');
    })().finally(() => { starting = null; });
    return starting;
  }
  const configure = (server) => {
    server.middlewares.use(async (request, response, next) => {
      if (!request.url?.startsWith('/api/narration')) return next();
      try { await ensure(); if (!request.destroyed) next(); }
      catch (error) {
        console.warn('[narration]', error.message);
        if (!response.destroyed) {
          response.statusCode = 503;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ error: 'Narration is temporarily unavailable.' }));
        }
      }
    });
  };
  return { name: 'lamina-local-narration', configureServer: configure, configurePreviewServer: configure };
}
