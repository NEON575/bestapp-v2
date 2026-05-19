import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = path.resolve(process.cwd());
const workspaceDirArg = process.argv[2];
const scriptName = process.argv[3];
const forwardedArgs = process.argv.slice(4);

if (!workspaceDirArg || !scriptName) {
  console.error('Usage: node scripts/run-workspace-command.mjs <workspace-dir> <script> [args...]');
  process.exit(1);
}

const workspaceDir = path.resolve(rootDir, workspaceDirArg);
const packageJsonPath = path.join(workspaceDir, 'package.json');

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function parseEnvFile(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

async function loadEnvFile(filePath, targetEnv) {
  if (!existsSync(filePath)) return;
  const content = await readFile(filePath, 'utf8');
  Object.assign(targetEnv, parseEnvFile(content));
}

async function loadWorkspaceEnv(targetEnv) {
  const candidates = [
    path.join(rootDir, '.env.example'),
    path.join(workspaceDir, '.env.example'),
    path.join(rootDir, '.env'),
    path.join(rootDir, '.env.local'),
    path.join(workspaceDir, '.env'),
    path.join(workspaceDir, '.env.local')
  ];

  for (const candidate of candidates) {
    await loadEnvFile(candidate, targetEnv);
  }
}

async function main() {
  const packageJson = await readJson(packageJsonPath);
  const mergedEnv = {};

  await loadWorkspaceEnv(mergedEnv);
  Object.assign(mergedEnv, process.env);

  if (packageJson.name === '@bestapp/backend') {
    mergedEnv.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/bestapp?schema=public';
    mergedEnv.JWT_SECRET ??= 'super-secret-dev-key-change-me';
    mergedEnv.JWT_EXPIRES_IN ??= '1d';
    mergedEnv.PORT ??= '3000';
    mergedEnv.CORS_ORIGIN ??= 'http://localhost:5173';
    mergedEnv.NODE_ENV ??= 'development';
  }

  if (packageJson.name === '@bestapp/frontend') {
    mergedEnv.VITE_API_BASE_URL ??= 'http://localhost:3000/api/v1';
    mergedEnv.VITE_API_URL ??= mergedEnv.VITE_API_BASE_URL;
  }

  const npmArgs = ['run', scriptName, '-w', packageJson.name, ...(forwardedArgs.length > 0 ? ['--', ...forwardedArgs] : [])];

  const child = process.platform === 'win32'
    ? spawn(
        process.env.ComSpec ?? 'cmd.exe',
        ['/d', '/s', '/c', ['npm', ...npmArgs.map(quoteCmdArg)].join(' ')],
        {
          cwd: rootDir,
          stdio: 'inherit',
          env: mergedEnv
        }
      )
    : spawn('npm', npmArgs, {
        cwd: rootDir,
        stdio: 'inherit',
        env: mergedEnv
      });

  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });
}

function quoteCmdArg(value) {
  if (value.length === 0) {
    return '""';
  }

  if (/[\s"&<>|^]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
