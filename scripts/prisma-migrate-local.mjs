import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const rootDir = process.cwd();
const backendDir = path.join(rootDir, 'apps', 'backend');
const migrationsDir = path.join(backendDir, 'prisma', 'migrations');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `${command} ${args.join(' ')} failed with code ${code}`));
    });
  });
}

async function listMigrations() {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function baselineExistingDatabase() {
  console.log('\nDetected non-empty local database without Prisma baseline.');
  console.log('Running safe schema sync and marking existing migrations as applied...\n');

  await run('npx', ['prisma', 'db', 'push', '--skip-generate'], { cwd: backendDir });

  const migrations = await listMigrations();
  for (const migration of migrations) {
    try {
      await run('npx', ['prisma', 'migrate', 'resolve', '--applied', migration], { cwd: backendDir });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('is already recorded as applied') ||
        message.includes('The migration has already been applied')
      ) {
        continue;
      }

      throw error;
    }
  }
}

async function main() {
  try {
    await run('npx', ['prisma', 'migrate', 'deploy'], { cwd: backendDir });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('P3005')) {
      throw error;
    }

    await baselineExistingDatabase();
    await run('npx', ['prisma', 'migrate', 'deploy'], { cwd: backendDir });
  }
}

void main().catch((error) => {
  console.error('\nLocal migration failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
