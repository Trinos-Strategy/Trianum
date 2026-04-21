# Security Policy

## Supported Versions

본 프로젝트는 초기 개발 단계(pre-audit)입니다. `main` 브랜치만 보안 업데이트 대상입니다.

| Version | Supported |
| ------- | --------- |
| main    | ✅        |
| < main  | ❌        |

## Reporting a Vulnerability

**공개 Issue로 올리지 마세요.** 스마트컨트랙트 취약점은 자금·분쟁당사자 정보 노출로 이어질 수 있어 **비공개 채널**로 접수합니다.

- GitHub Private Security Advisory: [Report a vulnerability](../../security/advisories/new)
- 이메일: **dkkim.esq@gmail.com** (PGP 키 요청 가능)
- 제보 시 포함 항목
  - 취약 시나리오 및 영향도 (자금 동결/탈취, 배심 조작, 거버넌스 우회 등)
  - 재현 절차 (PoC 코드 또는 트랜잭션 해시)
  - 영향받는 컨트랙트/모듈 경로
  - 제안하는 완화 방안(있는 경우)

## Response SLA

- **24시간 이내**: 접수 확인
- **7일 이내**: 초도 분석 및 심각도 평가 (CVSS v3 기준)
- **30일 이내**: 패치 또는 완화책 적용 목표 (심각도에 따라 조정)
- **공개 disclosure**: 패치 배포 후 90일 이내 제보자와 협의하여 공개

## Scope

### In scope
- `contracts/**` 스마트컨트랙트 (Kleros 코어, EscrowBridge, Governor 등)
- `scripts/**` 배포·운영 스크립트
- CI/CD 구성 (`.github/workflows/**`)
- 의존 패키지 (supply-chain) 관련 이슈

### Out of scope
- 테스트넷 가스·성능 이슈
- 유저 로컴 환경 설정 문제
- 자문·UX 관련 보고

## Safe Harbor

선의의 보안 연구(good-faith research)에 대해서는 한국 정보통신망법 및 관련 법령의 범위 내에서 법적 대응을 하지 않으며, 충분한 협조를 약속합니다. 단,

- 실제 사용자 자금/데이터에 접근하거나
- 서비스 가용성을 해치는 행위(DoS 등)

는 제외됩니다.

## Acknowledgements

유효한 취약점 제보자는 동의하신 경우 `SECURITY.md` 하단 또는 Release notes에 크레딧으로 기재됩니다.
