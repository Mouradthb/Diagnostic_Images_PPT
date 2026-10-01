// Local development server only. Vercel deploys the Vite build and api/ functions.
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { analyzePhoto } from './api/_lib/analyze.js';
import { getMemberKey, requireAuthorizedMember, verifyMember } from './api/_lib/auth.js';
import { publicError, publicErrorHeaders } from './api/_lib/httpError.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/me', async (request, response) => {
    try {
      const member = await verifyMember(request.get('authorization') ?? null);
      response.json({
        uid: member.uid,
        email: member.email,
        authorized: Boolean(getMemberKey(member.uid)),
      });
    } catch (error) {
      const result = publicError(error);
      response.status(result.status).json({ error: result.error });
    }
  });

  app.post('/api/analyze', async (request, response) => {
    const controller = new AbortController();
    const onDisconnect = () => {
      if (!response.writableEnded) controller.abort();
    };
    request.on('aborted', onDisconnect);
    response.on('close', onDisconnect);
    try {
      const member = await requireAuthorizedMember(request.get('authorization') ?? null);
      const result = await analyzePhoto(request.body, member.apiKey, controller.signal);
      if (!controller.signal.aborted) response.json(result);
    } catch (error) {
      const result = publicError(error);
      const { status, ...payload } = result;
      if (!controller.signal.aborted) response.status(status).set(publicErrorHeaders(result)).json(payload);
    } finally {
      request.off('aborted', onDisconnect);
      response.off('close', onDisconnect);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_request, response) => response.sendFile(path.join(distPath, 'index.html')));
  }

  const port = Number(process.env.PORT) || 3000;
  // Bind explicitly to IPv4: some browsers resolve localhost to 127.0.0.1 while
  // Windows may otherwise bind this server only to the IPv6 loopback address.
  app.listen(port, '127.0.0.1', () => {
    console.log(`Application locale : http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Démarrage du serveur local impossible', error);
  process.exitCode = 1;
});
