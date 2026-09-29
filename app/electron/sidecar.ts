import { ChildProcess, spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import { appLogger } from './logger';

export type EngineStatus = 'not_connected' | 'starting' | 'connected' | 'stopped';

export interface SidecarState {
  status: EngineStatus;
  host: string;
  port: number;
  pid?: number;
  uptimeSeconds?: number;
  version?: string;
  hardwareStatus: string;
  lastError?: string;
}

export class SidecarManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private host = '127.0.0.1';
  private port = 8765;
  private status: EngineStatus = 'not_connected';
  private lastError?: string;
  private isShuttingDown = false;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    super();
    this.projectRoot = projectRoot || path.resolve(__dirname, '..', '..');
  }

  public getStatus(): SidecarState {
    return {
      status: this.status,
      host: this.host,
      port: this.port,
      pid: this.process?.pid,
      hardwareStatus: 'Not Scanned Yet',
      lastError: this.lastError,
    };
  }

  private setStatus(newStatus: EngineStatus, error?: string): void {
    this.status = newStatus;
    if (error) this.lastError = error;
    appLogger.info(`Sidecar status transitioned to: ${newStatus}${error ? ` (${error})` : ''}`);
    this.emit('status-changed', this.getStatus());
  }

  private resolvePythonExecutable(): string {
    const isWin = process.platform === 'win32';

    // 1. Packaged Embedded Python runtime (Windows distribution)
    const bundledPythonPaths = [
      path.join(process.resourcesPath, 'python', 'python.exe'),
      path.join(this.projectRoot, 'resources', 'python', 'python.exe'),
    ];

    if (isWin) {
      for (const p of bundledPythonPaths) {
        if (fs.existsSync(p)) {
          appLogger.info(`Using bundled Python runtime: ${p}`);
          return p;
        }
      }
    }

    // 2. Check virtual environments
    const venvWindows = path.join(this.projectRoot, '.venv', 'Scripts', 'python.exe');
    const venvUnix = path.join(this.projectRoot, '.venv', 'bin', 'python');

    if (isWin && fs.existsSync(venvWindows)) {
      return venvWindows;
    }
    if (fs.existsSync(venvUnix)) {
      return venvUnix;
    }

    // 3. Fallback to system Python
    return isWin ? 'python' : 'python3';
  }

  private resolveScriptPath(): string {
    const candidates = [
      path.join(process.resourcesPath, 'engine', 'main.py'),
      path.join(this.projectRoot, 'engine', 'main.py'),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }

    return path.join(this.projectRoot, 'engine', 'main.py');
  }

  public async start(userDataPath?: string): Promise<SidecarState> {
    if (this.status === 'connected' || this.status === 'starting') {
      return this.getStatus();
    }

    this.isShuttingDown = false;
    this.setStatus('starting');

    const pythonBin = this.resolvePythonExecutable();
    const scriptPath = this.resolveScriptPath();

    if (!fs.existsSync(scriptPath)) {
      const err = `Engine entry script not found at ${scriptPath}`;
      this.setStatus('stopped', err);
      appLogger.error(err);
      throw new Error(err);
    }

    const args = [scriptPath, '--host', this.host, '--port', String(this.port)];
    if (userDataPath) {
      args.push('--user-data', userDataPath);
    }

    appLogger.info(`Starting Python Sidecar: ${pythonBin} ${args.join(' ')}`);

    try {
      this.process = spawn(pythonBin, args, {
        cwd: path.dirname(scriptPath),
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          PYTHONIOENCODING: 'utf-8',
          ...(userDataPath ? { AI_YOUTUBE_USER_DATA: userDataPath } : {}),
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8');
        appLogger.info(`[Engine stdout]: ${text.trim()}`);
        if (text.includes('AI_YOUTUBE_SIDECAR_READY')) {
          this.setStatus('connected');
        }
      });

      this.process.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8');
        appLogger.warn(`[Engine stderr]: ${text.trim()}`);
      });

      this.process.on('error', (err: Error) => {
        appLogger.error('Failed to spawn Python Sidecar process', err);
        this.setStatus('stopped', `Process spawn failed: ${err.message}`);
      });

      this.process.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
        appLogger.info(`Python Sidecar process terminated with code=${code} signal=${signal}`);
        this.process = null;
        if (!this.isShuttingDown) {
          this.setStatus('stopped', `Unexpected exit code: ${code}`);
        } else {
          this.setStatus('not_connected');
        }
      });

      // Poll health endpoint for up to 10 seconds to confirm readiness
      const connected = await this.waitForReady(10000);
      if (connected) {
        this.setStatus('connected');
      } else {
        this.setStatus('stopped', 'Timed out waiting for Python sidecar to respond');
      }

      return this.getStatus();
    } catch (err: any) {
      this.setStatus('stopped', err.message);
      appLogger.error('Fatal error starting Python sidecar', err);
      throw err;
    }
  }

  public async stop(): Promise<void> {
    if (!this.process && this.status === 'not_connected') {
      return;
    }

    this.isShuttingDown = true;
    appLogger.info('Stopping Python Sidecar process...');

    // Try graceful HTTP shutdown first
    try {
      await this.requestGracefulShutdown();
    } catch {
      // Fall through to OS kill
    }

    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch {
        this.process.kill('SIGKILL');
      }
      this.process = null;
    }

    this.setStatus('not_connected');
  }

  private requestGracefulShutdown(): Promise<void> {
    return new Promise((resolve) => {
      const req = http.request(
        {
          host: this.host,
          port: this.port,
          path: '/api/shutdown',
          method: 'POST',
          timeout: 1000,
        },
        () => resolve()
      );
      req.on('error', () => resolve());
      req.end();
    });
  }

  private waitForReady(timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    return new Promise((resolve) => {
      const check = () => {
        if (this.status === 'connected') {
          resolve(true);
          return;
        }

        if (Date.now() - startTime >= timeoutMs) {
          resolve(false);
          return;
        }

        const req = http.get(
          {
            host: this.host,
            port: this.port,
            path: '/api/health',
            timeout: 800,
          },
          (res) => {
            if (res.statusCode === 200) {
              resolve(true);
            } else {
              setTimeout(check, 400);
            }
          }
        );

        req.on('error', () => {
          setTimeout(check, 400);
        });
      };

      setTimeout(check, 300);
    });
  }
}

export const sidecarManager = new SidecarManager();
