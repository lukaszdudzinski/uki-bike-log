// @vitest-environment node
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const FILES = ['package.json', 'index.html', 'public/sw.js', 'public/changelog.json', 'scripts/version.mjs'];

let root: string;
let dir: string;
let remote: string;
let env: NodeJS.ProcessEnv;

const git = (args: string) => execSync(`git ${args}`, { cwd: dir, env, stdio: 'pipe' }).toString().trim();

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'bikelog-release-'));
  dir = join(root, 'repo');
  remote = join(root, 'remote.git');
  env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Test',
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test',
    GIT_COMMITTER_EMAIL: 'test@example.com',
  };
  for (const file of FILES) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    copyFileSync(join(process.cwd(), file), join(dir, file));
  }
  execSync(`git init --bare "${remote}"`, { env, stdio: 'pipe' });
  git('init -b main');
  git('add -A');
  git('commit -m init');
  git(`remote add origin "${remote}"`);
  git('push origin main');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('npm run release', () => {
  it('release commituje i wypycha wszystkie pliki zmienione przez version.mjs, a opis trafia do changelogu', { timeout: 60_000 }, () => {
    execSync('npm run release -- "🧪 Test wydania"', { cwd: dir, env, stdio: 'pipe' });
    expect(git('status --porcelain')).toBe('');
    expect(git('show --name-only --format= HEAD').split('\n').filter(Boolean).sort())
      .toEqual(['index.html', 'package.json', 'public/changelog.json', 'public/sw.js']);
    const version = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
    expect(readFileSync(join(dir, 'public/sw.js'), 'utf8')).toContain(`const CACHE_NAME = 'ukis-bikelog-v${version}';`);
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toContain(`<meta name="app-version" content="${version}">`);
    expect(JSON.parse(readFileSync(join(dir, 'public/changelog.json'), 'utf8'))[0])
      .toMatchObject({ version: `v${version}`, changes: ['🧪 Test wydania'] });
    expect(git('rev-parse HEAD')).toBe(execSync('git rev-parse main', { cwd: remote, env }).toString().trim());
  });
});
