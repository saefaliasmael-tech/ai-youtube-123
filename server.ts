import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import http from 'http';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';

const app = express();
const PORT = 3000;
const SIDECAR_HOST = '127.0.0.1';
const SIDECAR_PORT = 8765;

app.use(express.json());

let sidecarProcess: ChildProcess | null = null;
let sidecarStatus: 'Not Connected' | 'Starting' | 'Connected' | 'Stopped' = 'Not Connected';
let sidecarError: string | null = null;
let sidecarPid: number | undefined = undefined;

function startPythonSidecar() {
  if (sidecarProcess && !sidecarProcess.killed) {
    return;
  }

  sidecarStatus = 'Starting';
  sidecarError = null;

  const projectRoot = process.cwd();
  const scriptPath = path.join(projectRoot, 'engine', 'main.py');

  if (!fs.existsSync(scriptPath)) {
    sidecarStatus = 'Stopped';
    sidecarError = `Engine script not found at ${scriptPath}`;
    return;
  }

  try {
    sidecarProcess = spawn('python3', [scriptPath, '--host', SIDECAR_HOST, '--port', String(SIDECAR_PORT)], {
      cwd: projectRoot,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    sidecarPid = sidecarProcess.pid;

    sidecarProcess.stdout?.on('data', (data) => {
      const text = data.toString('utf-8');
      if (text.includes('AI_YOUTUBE_SIDECAR_READY')) {
        sidecarStatus = 'Connected';
      }
    });

    sidecarProcess.stderr?.on('data', (data) => {
      console.warn('[Engine stderr]:', data.toString('utf-8').trim());
    });

    sidecarProcess.on('close', (code) => {
      sidecarProcess = null;
      sidecarStatus = code === 0 ? 'Not Connected' : 'Stopped';
      if (code !== 0 && code !== null) {
        sidecarError = `Process exited with code ${code}`;
      }
    });

    sidecarProcess.on('error', (err) => {
      sidecarProcess = null;
      sidecarStatus = 'Stopped';
      sidecarError = err.message;
    });

    // Check health after a short delay
    setTimeout(checkSidecarHealth, 800);
  } catch (err: any) {
    sidecarStatus = 'Stopped';
    sidecarError = err.message;
  }
}

function stopPythonSidecar(): Promise<void> {
  return new Promise((resolve) => {
    if (!sidecarProcess) {
      sidecarStatus = 'Not Connected';
      resolve();
      return;
    }

    try {
      // Send shutdown to sidecar HTTP endpoint first
      const req = http.request(
        {
          host: SIDECAR_HOST,
          port: SIDECAR_PORT,
          path: '/api/shutdown',
          method: 'POST',
          timeout: 1000,
        },
        () => {
          sidecarProcess?.kill('SIGTERM');
          sidecarProcess = null;
          sidecarStatus = 'Not Connected';
          resolve();
        }
      );
      req.on('error', () => {
        sidecarProcess?.kill('SIGKILL');
        sidecarProcess = null;
        sidecarStatus = 'Not Connected';
        resolve();
      });
      req.end();
    } catch {
      sidecarProcess?.kill('SIGKILL');
      sidecarProcess = null;
      sidecarStatus = 'Not Connected';
      resolve();
    }
  });
}

function checkSidecarHealth() {
  const req = http.get(
    {
      host: SIDECAR_HOST,
      port: SIDECAR_PORT,
      path: '/api/health',
      timeout: 1500,
    },
    (res) => {
      if (res.statusCode === 200) {
        sidecarStatus = 'Connected';
      }
    }
  );
  req.on('error', () => {
    if (sidecarStatus === 'Starting') {
      // Still starting
    } else {
      sidecarStatus = 'Not Connected';
    }
  });
}

// Automatically start sidecar when server boots up
startPythonSidecar();

// Robust proxy to Sidecar API
app.use('/api', (req, res) => {
  const targetPath = `/api${req.url}`;

  // Handle local control endpoints
  if (req.method === 'POST' && targetPath === '/api/engine/start') {
    startPythonSidecar();
    res.json({ success: true, status: sidecarStatus });
    return;
  }

  if (req.method === 'POST' && targetPath === '/api/engine/stop') {
    stopPythonSidecar().then(() => {
      res.json({ success: true, status: sidecarStatus });
    });
    return;
  }

  // Forward to Sidecar HTTP server
  const proxyReq = http.request(
    {
      host: SIDECAR_HOST,
      port: SIDECAR_PORT,
      path: targetPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${SIDECAR_HOST}:${SIDECAR_PORT}`,
      },
      timeout: 15000,
    },
    (proxyRes) => {
      sidecarStatus = 'Connected';
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.status(504).json({
      error: 'Sidecar request timed out',
      engine: { status: sidecarStatus },
    });
  });

  proxyReq.on('error', (err) => {
    // Graceful handling of disconnected/starting engine without throwing unhandled proxy crashes
    if (targetPath === '/api/status') {
      res.json({
        app_name: 'AI YouTube',
        status: 'Application Ready',
        engine: {
          name: 'Python Sidecar',
          status: sidecarStatus,
          host: SIDECAR_HOST,
          port: SIDECAR_PORT,
          pid: sidecarPid,
        },
        hardware: 'Not Scanned Yet',
        last_error: sidecarError || err.message,
      });
    } else if (targetPath.startsWith('/api/hardware')) {
      res.status(503).json({
        scanned: false,
        status: 'Unavailable',
        error: sidecarError || err.message,
        message_ar: 'محرك بايثون غير متصل لإجراء فحص العتاد.',
        message_en: 'Python sidecar is not connected to perform hardware scan.',
      });
    } else if (targetPath === '/api/health') {
      res.status(503).json({
        status: 'error',
        engine_status: sidecarStatus,
        message: 'Python Sidecar is currently not reachable',
      });
    } else {
      res.status(503).json({
        error: 'Sidecar unavailable',
        status: sidecarStatus,
      });
    }
  });

  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI YouTube Server running on http://localhost:${PORT}`);
  });

  process.on('SIGTERM', async () => {
    await stopPythonSidecar();
    server.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await stopPythonSidecar();
    server.close();
    process.exit(0);
  });
}

startServer();
