import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const usage = '사용법: node scripts/validate.mjs [repository-root]';
if (process.argv.includes('--help')) {
  console.log(usage);
  process.exit(0);
}
if (process.argv.length > 3 || process.argv[2]?.startsWith('-')) {
  console.error(usage);
  process.exit(2);
}

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../', import.meta.url)));
const name = 'agent-unison';
const plugin = `plugins/${name}`;
const manifests = [
  `${plugin}/.claude-plugin/plugin.json`,
  `${plugin}/.codex-plugin/plugin.json`,
];

function readJson(path) {
  const value = JSON.parse(readFileSync(join(root, path), 'utf8'));
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), `${path}: JSON 객체가 필요합니다.`);
  return value;
}

function nonempty(value, field) {
  assert(typeof value === 'string' && value.trim().length > 0, `${field}: 문자열이 필요합니다.`);
}

try {
  const version = readFileSync(join(root, 'version.txt'), 'utf8').trim();
  assert(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version), 'version.txt: 정식 SemVer 형식이 필요합니다.');
  for (const path of manifests) {
    const manifest = readJson(path);
    assert.equal(manifest.name, name, `${path}: 이름이 폴더와 다릅니다.`);
    assert.equal(manifest.version, version, `${path}: version.txt와 버전이 다릅니다.`);
    assert.equal(manifest.skills, './skills/', `${path}: 스킬 경로가 다릅니다.`);
    nonempty(manifest.description, `${path}.description`);
    nonempty(manifest.author?.name, `${path}.author.name`);
  }

  const codex = readJson(manifests[1]);
  for (const field of ['displayName', 'shortDescription', 'longDescription', 'developerName', 'category']) {
    nonempty(codex.interface?.[field], `Codex interface.${field}`);
  }
  assert(Array.isArray(codex.interface.capabilities), 'Codex capabilities 배열이 필요합니다.');
  assert(Array.isArray(codex.interface.defaultPrompt) && codex.interface.defaultPrompt.length > 0, 'Codex 기본 프롬프트가 필요합니다.');
  for (const prompt of codex.interface.defaultPrompt) nonempty(prompt, 'Codex 기본 프롬프트');

  const claudeMarket = readJson('.claude-plugin/marketplace.json');
  const codexMarket = readJson('.agents/plugins/marketplace.json');
  for (const market of [claudeMarket, codexMarket]) {
    assert.equal(market.name, name, 'marketplace 이름이 다릅니다.');
    assert(Array.isArray(market.plugins) && market.plugins.length === 1, 'marketplace에는 플러그인 하나가 필요합니다.');
    assert.equal(market.plugins[0].name, name, 'marketplace 플러그인 이름이 다릅니다.');
  }
  nonempty(claudeMarket.owner?.name, 'Claude marketplace owner.name');
  assert.equal(claudeMarket.plugins[0].source, `./${plugin}`, 'Claude marketplace 경로가 다릅니다.');
  assert.deepEqual(codexMarket.plugins[0].source, { source: 'local', path: `./${plugin}` }, 'Codex marketplace 경로가 다릅니다.');
  assert.deepEqual(codexMarket.plugins[0].policy, { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, 'Codex marketplace 정책이 다릅니다.');
  assert.equal(codexMarket.plugins[0].category, 'Productivity', 'Codex marketplace 분류가 다릅니다.');

  const skills = readdirSync(join(root, plugin, 'skills'), { withFileTypes: true });
  assert(skills.length > 0, '스킬이 하나 이상 필요합니다.');
  for (const skill of skills) {
    assert(skill.isDirectory(), 'skills/에는 스킬 디렉터리만 둡니다.');
    const text = readFileSync(join(root, plugin, 'skills', skill.name, 'SKILL.md'), 'utf8');
    const metadata = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text)?.[1];
    assert(metadata, `${skill.name}: frontmatter가 필요합니다.`);
    assert.equal(/^name: ([a-z0-9-]+)\r?$/m.exec(metadata)?.[1], skill.name, `${skill.name}: name이 디렉터리와 다릅니다.`);
    nonempty(/^description: (.+)\r?$/m.exec(metadata)?.[1], `${skill.name}.description`);
  }

  assert.equal(readJson('.release-please-manifest.json')['.'], version, 'Release Please manifest 버전이 다릅니다.');
  const release = readJson('release-please-config.json').packages?.['.'];
  assert.equal(release?.['release-type'], 'simple', '릴리즈 전략은 simple이어야 합니다.');
  assert.equal(release['package-name'], name, '릴리즈 패키지 이름이 다릅니다.');
  assert.equal(release['include-component-in-tag'], false, '태그에 패키지 접두사를 넣지 않습니다.');
  assert.equal(release['include-v-in-tag'], true, '태그는 v 접두사를 사용합니다.');
  assert.deepEqual(release['extra-files'], manifests.map((path) => ({
    type: 'json', path, jsonpath: '$.version',
  })), '릴리즈는 두 plugin manifest의 version을 함께 갱신해야 합니다.');

  console.log(`패키지·버전·릴리즈 설정 검증 통과: ${name} ${version}`);
} catch (error) {
  if (!(error instanceof Error)) throw error;
  console.error(`검증 실패: ${error.message}`);
  process.exitCode = 1;
}
