# 릴리즈 버전은 Release Please PR에서 갱신한다

## 결정과 근거

Conventional Commits에서 버전 변경 수준을 계산하고, Release Please가 버전·changelog를 갱신하는 PR을 만든다. 관리자가 PR을 병합하면 다음 Release 워크플로가 태그와 GitHub Release를 생성한다. 자동 병합은 하지 않는다. 이 흐름은 [Release Please의 공식 동작](https://github.com/googleapis/release-please-action#how-release-please-works)을 사용한다.

| 비교안 | 판단 |
| --- | --- |
| yw-dev의 main push → 버전 커밋·태그·Release 생성 | 커밋 기반 버전 판정과 동일한 검증 게이트는 참고한다. 이 프로젝트에서는 봇이 main에 버전 커밋을 직접 push하는 흐름과 별도 버전 계산 스크립트를 채택하지 않는다. |
| Release Please의 버전 PR → 병합 후 태그·Release 생성 | 채택한다. 변경 내용을 검토할 수 있고 버전·changelog 생성 로직을 직접 유지하지 않아도 된다. Actions의 PR 생성 권한이 필요하며 관리자의 병합 단계가 추가된다. |

yw-dev 참고 범위: [검토한 릴리즈 워크플로](https://github.com/YeongWon2/yw-ai-plugin/blob/d196b9fb320de4ba5dab3510422969dbfb9816f9/.github/workflows/release.yml). 소스 코드를 복제하지 않고 구조를 비교했다.

## 버전의 원본과 갱신 대상

`version.txt`를 프로젝트 버전의 기준으로 사용한다. Release Please의 `simple` 전략은 `version.txt`와 `CHANGELOG.md`를 관리하고, `extra-files`의 JSONPath 지정으로 두 plugin manifest의 `version`을 함께 갱신한다. `.release-please-manifest.json`은 Release Please가 추적하는 버전이다. 네 버전 값이 다르면 CI가 실패한다. [추가 JSON 파일 갱신](https://github.com/googleapis/release-please/blob/main/docs/customizing.md#updating-arbitrary-json-files)

| 커밋 예 | 버전 영향 |
| --- | --- |
| `fix: 스킬 탐색 경로 수정` | patch |
| `feat: 동기화 미리보기 추가` | minor |
| `feat!: 원본 설정 형식 변경` 또는 `BREAKING CHANGE:` footer | major |
| `docs: 설치 안내 수정`, `ci: 검증 단계 추가`만 존재 | 단독으로 새 릴리즈를 만들지 않음 |

이는 프로젝트의 릴리즈 규칙이다. 초기 값 `0.0.0`은 발행된 버전이 아니다. 첫 발행은 `initial-version: 0.1.0`으로 지정한다. 이 설정은 최초 버전에만 적용하며, 이후에는 커밋에 따라 버전을 계산한다. 미설정 시 첫 버전을 1.0.0으로 잡는 기본 동작을 피하기 위한 결정이다. [공식 설정 schema](https://github.com/googleapis/release-please/blob/main/schemas/config.json)

버전 숫자를 여러 파일에 따로 수동 입력하지 않는다. 릴리즈 PR의 버전은 동기화 엔진의 구현 여부와 별개다.

## CI와 릴리즈 흐름

1. 모든 브랜치 push와 PR에서 CI가 `npm run check`를 실행한다.
2. `main` push 또는 main을 대상으로 한 수동 실행에서 Release 워크플로가 같은 검증을 먼저 실행한다.
3. 검증이 통과하면 Release Please가 기존 릴리즈 PR을 갱신하거나 새 PR을 만든다. 이미 병합된 릴리즈 PR이 있으면 해당 버전의 태그·Release를 생성한다.
4. 릴리즈 PR을 만들거나 갱신한 실행은 그 PR 브랜치의 CI를 `workflow_dispatch`로 명시적으로 실행한다.
5. 관리자가 릴리즈 PR의 버전·changelog와 해당 커밋의 CI 결과를 확인한 후 병합한다.

기본 `GITHUB_TOKEN`으로 만든 이벤트는 일반적인 사용자 push와 트리거 동작이 다르다. GitHub 문서상 봇 PR의 일부 이벤트는 워크플로 승인 대기 상태가 될 수 있고, `workflow_dispatch`는 실행을 생성하는 예외다. 따라서 별도 PAT 없이 dispatch를 사용한다. 승인 대기 배너가 함께 보이면 관리자가 확인한다. [GitHub 워크플로 트리거](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)

CI에는 `contents: read`만 부여한다. Release 작업에는 태그·Release용 `contents: write`, 릴리즈 PR·label용 `pull-requests: write`와 `issues: write`, CI dispatch용 `actions: write`를 부여한다. Action 코드는 확인한 SHA로 고정한다. 릴리즈 실행은 `cancel-in-progress: false`로 설정해 실행 중인 작업을 새 push가 취소하지 않게 한다.

## 저장소 활성화 조건

- 기본 브랜치는 `main`으로 운영한다. 최초 기반 구축 브랜치를 검토한 뒤 main에 반영한다.
- Settings → Actions → General → Workflow permissions에서 **Allow GitHub Actions to create and approve pull requests**를 활성화한다. 워크플로가 자체 PR을 승인하거나 자동 병합하는 단계는 없다.
- 기본 워크플로 권한은 read로 유지한다. 필요한 쓰기 권한은 Release job에만 선언한다.
- 브랜치 보호를 설정한다면 현재 커밋의 CI 검증을 병합 조건으로 사용한다. 이 작업은 보호 설정을 임의로 변경하지 않는다.

필요한 secret은 저장소가 제공하는 `GITHUB_TOKEN`뿐이다. npm 자격 증명·PAT·별도 서버는 필요하지 않다. 현재 워크플로는 소스 태그와 GitHub Release까지만 관리한다.

## 실패 시 확인

| 증상 | 확인·대응 |
| --- | --- |
| Actions가 PR을 만들 수 없음 | 위 PR 생성 설정과 조직 정책을 확인한 뒤 main의 Release 워크플로를 재실행한다. |
| 버전 불일치로 CI 실패 | 릴리즈 PR의 `version.txt`, 두 manifest, Release Please manifest를 비교한다. `extra-files` 설정도 확인한다. |
| 릴리즈 PR의 CI가 없음 | Release 실행의 CI dispatch 단계를 확인한다. 필요하면 해당 PR 브랜치를 선택해 CI를 수동 실행한다. |
| 릴리즈 PR 병합 후 Release 없음 | 병합 커밋의 Release 워크플로 로그를 확인한다. 실패 원인을 수정한 뒤 워크플로를 재실행한다. 임의로 기존 태그를 이동하거나 삭제하지 않는다. |
| 문서 수정만 반영했는데 릴리즈 PR이 없음 | 릴리즈를 유발하는 커밋이 있는지 확인한다. 문서·CI 커밋만으로 릴리즈를 만들지 않는 것은 의도한 동작이다. |

설정과 검증 통과만으로 최초 태그·GitHub Release 발행까지 확인했다고 표현하지 않는다. 첫 릴리즈 PR 병합과 실제 발행은 관리자가 수행하는 별도 단계다.
