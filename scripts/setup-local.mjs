import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(process.cwd());

const targets = [
  {
    example: path.join(rootDir, 'apps/backend/.env.example'),
    output: path.join(rootDir, 'apps/backend/.env')
  },
  {
    example: path.join(rootDir, 'apps/frontend/.env.example'),
    output: path.join(rootDir, 'apps/frontend/.env')
  }
];

async function ensureFileFromExample(example, output, fallbackContent) {
  await mkdir(path.dirname(output), { recursive: true });

  if (existsSync(output)) {
    return 'exists';
  }

  if (existsSync(example)) {
    await copyFile(example, output);
    return 'copied';
  }

  await writeFile(output, fallbackContent, 'utf8');
  return 'created';
}

async function main() {
  const results = [];

  for (const target of targets) {
    const fallbackContent = target.output.includes('backend')
      ? [
          'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bestapp?schema=public',
          'JWT_SECRET=super-secret-dev-key-change-me',
          'JWT_EXPIRES_IN=1d',
          'PORT=3000',
          'CORS_ORIGIN=http://localhost:5173',
          'NODE_ENV=development',
          ''
        ].join('\n')
      : ['VITE_API_URL=http://localhost:3000', ''].join('\n');

    const status = await ensureFileFromExample(target.example, target.output, fallbackContent);
    results.push(`${path.relative(rootDir, target.output)}: ${status}`);
  }

  console.log('Local environment files are ready:');
  for (const line of results) {
    console.log(`- ${line}`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
