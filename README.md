# Agent Unison

Claude Code와 Codex의 스킬·지침·참고 문서를 같은 기준으로 관리하기 위한 플러그인입니다.

현재는 **동기화 계획 수립 스킬과 개발·릴리즈 기반**을 제공합니다. 파일 자동 동기화, 양방향 병합, 기기 간 전송은 아직 구현하지 않았습니다. `0.0.0`은 첫 릴리즈 전 개발 기준 버전입니다.

## 현재 기능

`plan-sync` 스킬은 사용자가 선택한 파일을 읽고 공통 내용, 도구별 차이, 참조 의존성, 충돌 가능성을 정리합니다. 대상 파일을 자동으로 수정하지 않습니다.

예시 요청:

> 이 프로젝트의 Claude와 Codex 스킬·지침을 확인하고, 공통 원본으로 관리할 범위와 동기화 계획을 작성해줘.

## 로컬 설치

저장소를 clone한 디렉터리에서 실행합니다. 설치 명령은 각 도구의 사용자 설정에 marketplace와 플러그인을 등록합니다.

### Claude Code

```sh
claude plugin marketplace add .
claude plugin install agent-unison@agent-unison
```

Claude Code의 새 세션에서 `/agent-unison:plan-sync`를 호출합니다. 개발 중에는 설치 없이 `claude --plugin-dir ./plugins/agent-unison`으로 로컬 플러그인을 로드할 수도 있습니다. [Claude Code 플러그인 문서](https://code.claude.com/docs/en/plugins)

### Codex

```sh
codex plugin marketplace add .
codex plugin add agent-unison@agent-unison
```

Codex를 새로 열고 Agent Unison으로 동기화 계획을 세워 달라고 요청합니다. 위 CLI 구문은 `codex-cli 0.153.4`의 도움말을 기준으로 확인했습니다. 앱에서 설치하는 경우 marketplace 등록 후 플러그인 목록에서 Agent Unison을 선택합니다.

## 개발 검증

Node.js 24 이상을 사용합니다. npm 의존성이 없으므로 패키지 설치 없이 실행할 수 있습니다.

```sh
npm run check
```

검증기는 두 도구의 manifest, marketplace 연결, 스킬 기본 메타데이터, 버전 일치, Release Please 갱신 대상을 확인합니다. 테스트는 임시 디렉터리에서 정상·오류 입력을 실제 CLI로 검증합니다. 이 검사는 각 도구의 전체 schema 검증이나 모델의 지시 준수 검증을 대신하지 않습니다.

## 구조

```text
.claude-plugin/marketplace.json       Claude marketplace
.agents/plugins/marketplace.json      Codex marketplace
plugins/agent-unison/
  .claude-plugin/plugin.json          Claude plugin manifest
  .codex-plugin/plugin.json           Codex plugin manifest
  skills/plan-sync/SKILL.md           두 도구가 공유하는 계획 스킬
scripts/                             저장소 검증기와 테스트
.github/workflows/                    CI·릴리즈 자동화
```

## 릴리즈와 후속 계획

`main` 반영 후 Release Please가 Conventional Commits를 읽어 버전 변경 PR을 만듭니다. 관리자가 그 PR을 병합하면 태그와 GitHub Release를 생성합니다. 자동 병합과 npm publish는 구성하지 않았습니다. [릴리즈 운영 방법](docs/design/releases.md)

동기화 엔진의 범위와 대안은 [개발 계획](docs/PLAN.md)에 정리했습니다. 한 기기·여러 기기, 전역·프로젝트, 공통 원본 관리 방식은 다음 설계 단계에서 결정합니다.
