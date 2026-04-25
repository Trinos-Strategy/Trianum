# Contributing to Trianum

감사합니다! Trianum는 한국형 탈중앙화 분쟁해결 플랫폼을 함께 만들어갈 기여자를 환영합니다.

## 기여 절차

### 1. Issue 먼저
- 새 기능/버그 수정 전에 반드시 [Issue](../../issues)를 먼저 열어주세요
- Issue 템플릿(Bug Report / Feature Request / Legal Design)을 활용해 주세요

### 2. Fork & Branch
```bash
git clone https://github.com/<your-fork>/Trianum.git
cd Trianum
npm ci
git checkout -b feat/my-feature   # or fix/ docs/ test/ chore/
```

### 3. 개발 규칙
- **Solidity**: Natspec 주석 필수 (`@notice`, `@param`, `@return`)
- **커밋**: [Conventional Commits](https://www.conventionalcommits.org/) 준수
  - `feat(escrow):` / `fix(governor):` / `docs:` / `test:` / `chore:`
- **테스트**: 새 기능/버그수정에는 반드시 테스트 추가

### 4. 로컬 검증 (PR 전 필수)
```bash
npx hardhat compile   # 84 files 컴파일 성공 확인
npx hardhat test      # 기존 테스트 실패 없음 확인
```

### 5. PR 생성
- PR 템플릿을 채워주세요
- `main` 브랜치 대상 PR
- CI(컴파일 + 테스트) 통과 필수

### 6. 리뷰 및 병합
- 코드 리뷰 후 Squash & Merge
- **CI/테스트 실패 상태의 PR은 절대 병합하지 않습니다**

## 언어
- 코드·커밋·PR: **영어** 권장
- Issue·Discussions·문서: **한국어/영어** 모두 가능

## 행동 강령
[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)를 읽어주세요. 모든 기여자는 이를 준수해야 합니다.

## 보안 취약점
[SECURITY.md](./SECURITY.md)를 참조하세요. Public Issue로 올리지 마세요.
