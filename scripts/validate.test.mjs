import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repository = fileURLToPath(new URL('../', import.meta.url));
const plugin = 'plugins/agent-unison';
const validator = join(repository, 'scripts/validate.mjs');

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'agent-unison-check-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const path of [
    '.claude-plugin', '.agents', 'plugins', 'version.txt',
    'release-please-config.json', '.release-please-manifest.json',
  ]) {
    cpSync(join(repository, path), join(root, path), { recursive: true });
  }
  return root;
}

function update(root, path, mutate) {
  const value = JSON.parse(readFileSync(join(root, path), 'utf8'));
  mutate(value);
  writeFileSync(join(root, path), JSON.stringify(value));
}

function check(root) {
  return spawnSync(process.execPath, [validator, root], { encoding: 'utf8' });
}

test('정상 패키지는 검증을 통과한다', (t) => {
  const root = fixture(t);
  const result = check(root);
  assert.equal(result.status, 0, result.stderr);
});

test('plugin manifest 버전이 다르면 거부한다', (t) => {
  const root = fixture(t);
  update(root, `${plugin}/.codex-plugin/plugin.json`, (value) => { value.version = '9.9.9'; });
  const result = check(root);
  assert.equal(result.status, 1);
});

test('marketplace가 패키지 밖을 가리키면 거부한다', (t) => {
  const root = fixture(t);
  update(root, '.agents/plugins/marketplace.json', (value) => {
    value.plugins[0].source.path = '../outside';
  });
  const result = check(root);
  assert.equal(result.status, 1);
});

test('발견할 SKILL.md가 없으면 거부한다', (t) => {
  const root = fixture(t);
  rmSync(join(root, plugin, 'skills/plan-sync/SKILL.md'));
  const result = check(root);
  assert.equal(result.status, 1);
});

test('릴리즈에서 갱신할 manifest가 빠지면 거부한다', (t) => {
  const root = fixture(t);
  update(root, 'release-please-config.json', (value) => {
    value.packages['.']['extra-files'].pop();
  });
  const result = check(root);
  assert.equal(result.status, 1);
});

test('정수 앞에 0이 붙은 버전은 거부한다', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'version.txt'), '01.0.0\n');
  const result = check(root);
  assert.equal(result.status, 1);
});

test('JSON이 손상되면 검증이 실패한다', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, plugin, '.claude-plugin/plugin.json'), '{');
  const result = check(root);
  assert.equal(result.status, 1);
});
