# K-Kleros XRPL MVP — GitHub Repo Setup Prompt

> **용도**: 이 프롬프트를 Claude Code 또는 Codex 터미널에 붙여넣으면, GitHub repo에 전체 Hardhat 프로젝트 구조를 자동 생성합니다.
> **Repo**: https://github.com/Trinos-Strategy/KKleros

---

## PROMPT START

```
You are setting up a Solidity smart contract project for K-Kleros, a blockchain-native dispute resolution protocol on the XRPL EVM Sidechain. Follow every step below exactly. Do NOT skip any file. Do NOT ask questions — execute everything.

## 1. Clone & Initialize

```bash
git clone https://github.com/Trinos-Strategy/KKleros.git
cd KKleros
git checkout -b feat/hardhat-scaffold
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox typescript ts-node @types/node
npx hardhat init  # Choose "Create a TypeScript project", say yes to all defaults
npm install @openzeppelin/contracts@^5.0.0 @openzeppelin/contracts-upgradeable@^5.0.0
npm install @axelar-network/axelar-gmp-sdk-solidity@^5.0.0
npm install --save-dev @nomicfoundation/hardhat-verify solidity-coverage hardhat-gas-reporter hardhat-contract-sizer
```

Read the file at ~/Documents/a6_Kleros Alpha +/K-Kleros Alpha/K-Kleros_XRPL_MVP/03_implementation/PROMPT_repo_setup.md and execute sections 2 through 12. Section 1 is already done. Start from "## 2. Directory Structure" and create all files exactly as specified.


## 2. Directory Structure

Create this exact directory tree:

```
contracts/
├── interfaces/
│   ├── IKlerosCore.sol
│   ├── IDisputeKit.sol
│   ├── ISortitionModule.sol
│   ├── IKPNKToken.sol
│   ├── IEscrowBridge.sol
│   ├── IKKlerosGovernor.sol
│   └── IKKlerosTimelock.sol
├── libraries/
│   └── DataStructures.sol
├── core/
│   ├── KlerosCore.sol
│   └── DisputeKit.sol
├── modules/
│   ├── SortitionModule.sol
│   └── EscrowBridge.sol
├── token/
│   └── KPNKToken.sol
├── governance/
│   ├── KKlerosGovernor.sol
│   └── KKlerosTimelock.sol
└── mocks/
    ├── MockArbitrable.sol
    └── MockAxelarGateway.sol

test/
├── KlerosCore.test.ts
├── DisputeKit.test.ts
├── SortitionModule.test.ts
├── KPNKToken.test.ts
├── EscrowBridge.test.ts
├── KKlerosGovernor.test.ts
├── KKlerosTimelock.test.ts
└── helpers/
    └── setup.ts

scripts/
├── deploy.ts
├── deploy-testnet.ts
└── verify.ts
```

## 3. Shared Data Structures — contracts/libraries/DataStructures.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library DataStructures {

    /// @dev 분쟁 상태
    enum DisputeStatus {
        None,           // 0: 미생성
        Created,        // 1: 생성됨
        Evidence,       // 2: 증거 제출 중
        DualAward,      // 3: 중재인 듀얼 어워드 작성 중
        Commit,         // 4: 배심원 커밋 투표 중
        Reveal,         // 5: 배심원 투표 공개 중
        Resolved,       // 6: 투표 집계 완료
        Appealable,     // 7: 항소 가능 기간
        Appealed,       // 8: 항소 접수됨
        Executed        // 9: 판정 집행 완료
    }

    /// @dev 법원 유형
    enum CourtType {
        General,        // 0: 범용
        DeFi,           // 1: DeFi
        NFT,            // 2: NFT
        DAO             // 3: DAO
    }

    /// @dev 투표 선택지
    enum VoteChoice {
        Refused,        // 0: 분쟁 거부
        AwardA,         // 1: 청구인 승
        AwardB          // 2: 피신청인 승
    }

    /// @dev 에스크로 상태
    enum EscrowStatus {
        None,              // 0
        Registered,        // 1
        DisputeCreated,    // 2
        RulingReceived,    // 3
        ExecutionSent,     // 4
        Executed,          // 5
        ExecutionFailed,   // 6
        Refunded,          // 7
        Cancelled          // 8
    }

    /// @dev 프로포절 유형 (Governor)
    enum ProposalType {
        ParameterChange,    // 0
        CourtCreation,      // 1
        ArbitratorPanel,    // 2
        TreasurySmall,      // 3 — <5%
        TreasuryLarge,      // 4 — ≥5%
        ContractUpgrade,    // 5
        RuleAmendment,      // 6
        ConstitutionChange  // 7
    }

    /// @dev 프로포절 상태
    enum ProposalStatus {
        Draft,       // 0
        Discussion,  // 1
        Voting,      // 2
        Passed,      // 3
        Failed,      // 4
        Timelocked,  // 5
        Vetoed,      // 6
        Executed,    // 7
        Cancelled    // 8
    }

    /// @dev 분쟁 정보
    struct Dispute {
        address arbitrable;         // 분쟁 가능 컨트랙트
        CourtType courtType;        // 법원 유형
        DisputeStatus status;       // 현재 상태
        address arbitrator;         // 배정된 중재인
        uint256 disputeAmount;      // 분쟁 금액 (wei)
        uint256 createdAt;          // 생성 타임스탬프
        uint256 ruling;             // 최종 판정 (0/1/2)
        uint256 appealCount;        // 항소 횟수
        bytes32 escrowID;           // XRPL 에스크로 ID
    }

    /// @dev 투표 라운드 정보
    struct Round {
        uint256 disputeID;
        uint256 roundNumber;        // 0 = 원심, 1+ = 항소
        address[] jurors;           // 추첨된 배심원
        uint256 commitDeadline;     // Commit 마감
        uint256 revealDeadline;     // Reveal 마감
        uint256 votesA;             // Award A 득표
        uint256 votesB;             // Award B 득표
        uint256 votesRefused;       // 거부 득표
        bool tallied;               // 집계 완료
    }

    /// @dev 법원 설정
    struct CourtConfig {
        uint256 minJurors;          // 최소 배심원 수
        uint256 minStake;           // 최소 스테이킹 (K-PNK)
        uint256 feePerJuror;        // 배심원 1인당 보상
        bool active;                // 활성 여부
    }

    /// @dev 듀얼 어워드 패키지
    struct DualAwardPackage {
        bytes32 awardAHash;         // Award A IPFS CID의 keccak256
        bytes32 awardBHash;         // Award B IPFS CID의 keccak256
        bytes32 casePackageRoot;    // Case Package 전체 IPFS CID
        uint256 committedAt;        // 커밋 타임스탬프
        bool committed;             // 커밋 완료 여부
    }

    /// @dev 에스크로 정보 (Cross-chain)
    struct Escrow {
        uint256 amount;
        address claimant;
        address respondent;
        uint96 courtId;
        bytes32 xrplCondition;     // CryptoCondition 해시
        EscrowStatus status;
        uint256 disputeId;
        uint256 createdAt;
        uint256 ruling;
        bytes32 fulfillment;       // Preimage
        uint256 retryCount;
        uint256 lastRetryAt;
        string xrplTxHash;         // 집행 XRPL Tx 해시
        string awardAnchorHash;    // 판정 앵커링 해시
    }

    /// @dev 거버넌스 프로포절
    struct Proposal {
        uint256 id;
        address proposer;
        ProposalType pType;
        ProposalStatus status;
        uint256 forConviction;     // 찬성 Conviction 합계
        uint256 againstConviction; // 반대 Conviction 합계
        uint256 discussionEnd;
        uint256 votingEnd;
        uint256 timelockEnd;
        bytes callData;            // 실행할 트랜잭션 데이터
    }
}
```

## 4. Interface Files

### 4.1 contracts/interfaces/IKlerosCore.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/DataStructures.sol";

/**
 * @title IKlerosCore
 * @notice 메인 중재 허브 — IArbitrator (ERC-792) 구현
 * @dev 분쟁 생성·관리, 법원 설정, 판정 집행
 */
interface IKlerosCore {

    // ── Events ──
    event DisputeCreated(uint256 indexed disputeID, address indexed arbitrable, DataStructures.CourtType courtType, uint256 disputeAmount, bytes32 escrowID);
    event ArbitratorAssigned(uint256 indexed disputeID, address indexed arbitrator);
    event DisputeStatusChanged(uint256 indexed disputeID, DataStructures.DisputeStatus oldStatus, DataStructures.DisputeStatus newStatus);
    event RulingExecuted(uint256 indexed disputeID, uint256 ruling, address indexed arbitrable);
    event AppealRaised(uint256 indexed disputeID, uint256 appealRound, address indexed appellant);

    // ── IArbitrator (ERC-792) ──
    function createDispute(uint256 _choices, bytes calldata _extraData) external payable returns (uint256 disputeID);
    function arbitrationCost(bytes calldata _extraData) external view returns (uint256 cost);
    function appeal(uint256 _disputeID, bytes calldata _extraData) external payable;
    function appealCost(uint256 _disputeID, bytes calldata _extraData) external view returns (uint256 cost);
    function appealPeriod(uint256 _disputeID) external view returns (uint256 start, uint256 end);
    function currentRuling(uint256 _disputeID) external view returns (uint256 ruling);

    // ── K-Kleros Extensions ──
    function assignArbitrator(uint256 _disputeID, address _arbitrator) external;
    function closeEvidencePeriod(uint256 _disputeID) external;
    function signAward(uint256 _disputeID, bytes calldata _signature) external;
    function executeRuling(uint256 _disputeID) external;

    // ── Views ──
    function getDispute(uint256 _disputeID) external view returns (DataStructures.Dispute memory);
    function getCourtConfig(DataStructures.CourtType _courtType) external view returns (DataStructures.CourtConfig memory);
    function disputeCount() external view returns (uint256);
}
```

### 4.2 contracts/interfaces/IDisputeKit.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/DataStructures.sol";

/**
 * @title IDisputeKit
 * @notice 듀얼 어워드 Commit-Reveal 투표 엔진
 */
interface IDisputeKit {

    event DualAwardCommitted(uint256 indexed disputeID, bytes32 awardAHash, bytes32 awardBHash, bytes32 casePackageRoot);
    event VotingStarted(uint256 indexed disputeID, uint256 roundNumber, uint256 commitDeadline, uint256 revealDeadline);
    event VoteCommitted(uint256 indexed disputeID, address indexed juror, bytes32 commitHash);
    event VoteRevealed(uint256 indexed disputeID, address indexed juror, uint256 choice);
    event VotesTallied(uint256 indexed disputeID, uint256 roundNumber, uint256 votesA, uint256 votesB, uint256 votesRefused, uint256 ruling);
    event TieDetected(uint256 indexed disputeID, uint256 roundNumber);

    // Arbitrator
    function commitDualAward(uint256 _disputeID, bytes32 _awardAHash, bytes32 _awardBHash, bytes32 _casePackageRoot) external;

    // Voting lifecycle
    function startVoting(uint256 _disputeID, address[] calldata _jurors, uint256 _roundNumber) external;
    function commitVote(uint256 _disputeID, bytes32 _commit) external;
    function revealVote(uint256 _disputeID, uint256 _choice, uint256 _salt) external;
    function tallyVotes(uint256 _disputeID) external returns (uint256 ruling);
    function resolveTie(uint256 _disputeID, uint256 _ruling) external;

    // Views
    function getVoteCount(uint256 _disputeID, uint256 _roundNumber) external view returns (uint256 votesA, uint256 votesB, uint256 votesRefused);
    function getDualAwardPackage(uint256 _disputeID) external view returns (DataStructures.DualAwardPackage memory);
    function hasCommitted(uint256 _disputeID, address _juror) external view returns (bool);
    function hasRevealed(uint256 _disputeID, address _juror) external view returns (bool);
    function getRound(uint256 _disputeID, uint256 _roundNumber) external view returns (DataStructures.Round memory);
}
```

### 4.3 contracts/interfaces/ISortitionModule.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISortitionModule
 * @notice 스테이킹 기반 가중 랜덤 배심원 추첨
 */
interface ISortitionModule {

    event Staked(address indexed juror, uint96 indexed courtID, uint256 amount, uint256 totalStake);
    event UnstakeRequested(address indexed juror, uint96 indexed courtID, uint256 amount, uint256 availableAt);
    event JurorDrawn(uint256 indexed disputeID, address indexed juror, uint96 courtID, uint256 roundNumber);
    event Slashed(address indexed juror, uint256 indexed disputeID, uint256 amount);
    event Rewarded(address indexed juror, uint256 indexed disputeID, uint256 amount);

    // Staking
    function stake(uint96 _courtID, uint256 _amount) external;
    function requestUnstake(uint96 _courtID, uint256 _amount) external;
    function executeUnstake(uint96 _courtID) external;

    // Drawing (KlerosCore only)
    function draw(uint256 _disputeID, uint96 _courtID, uint256 _count, uint256 _nonce) external returns (address[] memory jurors);

    // Penalty / Reward (KlerosCore only)
    function penalize(address _juror, uint256 _disputeID) external returns (uint256 slashedAmount);
    function reward(address _juror, uint256 _disputeID, uint256 _amount) external;

    // Views
    function getStake(address _juror, uint96 _courtID) external view returns (uint256);
    function getTotalStaked(uint96 _courtID) external view returns (uint256);
    function getUnstakeRequest(address _juror, uint96 _courtID) external view returns (uint256 amount, uint256 availableAt);
    function isJurorActive(address _juror) external view returns (bool);
}
```

### 4.4 contracts/interfaces/IKPNKToken.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IKPNKToken
 * @notice K-PNK Work Token (ERC-20 + ERC20Votes)
 * @dev Total supply: 1,000,000,000 (1B). No revenue distribution. 3 uses only: staking, governance, court creation.
 */
interface IKPNKToken {

    event TransferRestrictionChanged(address indexed account, bool restricted);

    function setTransferRestriction(address _account, bool _restricted) external;
    function isTransferRestricted(address _account) external view returns (bool);
    function initialDistribution(address[] calldata _recipients, uint256[] calldata _amounts) external;
}
```

### 4.5 contracts/interfaces/IEscrowBridge.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/DataStructures.sol";

/**
 * @title IEscrowBridge
 * @notice Axelar GMP를 통한 XRPL 네이티브 에스크로 연동
 */
interface IEscrowBridge {

    event EscrowRegistered(bytes32 indexed escrowID, uint256 indexed disputeID, uint256 amount, address claimant, address respondent);
    event FundsReleaseRequested(bytes32 indexed escrowID, uint256 indexed disputeID, address winner, uint256 amount);
    event FundsRefundRequested(bytes32 indexed escrowID, uint256 indexed disputeID);
    event RetryRequested(bytes32 indexed escrowID, uint256 retryCount);

    function registerEscrow(bytes32 _escrowID, uint256 _amount, address _claimant, address _respondent, uint96 _courtId, bytes32 _xrplCondition) external;
    function releaseFunds(bytes32 _escrowID, address _winner) external;
    function refundFunds(bytes32 _escrowID) external;
    function retryRelease(bytes32 _escrowID) external;

    function getEscrow(bytes32 _escrowID) external view returns (DataStructures.Escrow memory);
    function getRetryCount(bytes32 _escrowID) external view returns (uint256);
}
```

### 4.6 contracts/interfaces/IKKlerosGovernor.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/DataStructures.sol";

/**
 * @title IKKlerosGovernor
 * @notice DAO 거버넌스 — Conviction Voting + Guardian Council
 * @dev Progressive Decentralization 4단계: Core Team → Council → Hybrid DAO → Full DAO
 *
 * Proposal requirements by type:
 *   ParameterChange:    quorum 10%, approval 50%, timelock 24h
 *   CourtCreation:      quorum 20%, approval 60%, timelock 48h
 *   TreasurySmall:      quorum 15%, approval 50%, timelock 24h
 *   TreasuryLarge:      quorum 30%, approval 67%, timelock 72h
 *   ContractUpgrade:    quorum 40%, approval 67%, timelock 7d
 *   ConstitutionChange: quorum 50%, approval 75%, timelock 14d
 */
interface IKKlerosGovernor {

    event ProposalCreated(uint256 indexed proposalId, address proposer, DataStructures.ProposalType pType);
    event VoteCast(uint256 indexed proposalId, address voter, bool support, uint256 conviction);
    event ProposalPassed(uint256 indexed proposalId);
    event ProposalFailed(uint256 indexed proposalId);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalVetoed(uint256 indexed proposalId);
    event EmergencyPause(address indexed caller, string reason);
    event EmergencyUnpause(address indexed caller);

    function propose(DataStructures.ProposalType pType, bytes calldata callData, string calldata description) external returns (uint256 proposalId);
    function castVote(uint256 proposalId, bool support) external;
    function execute(uint256 proposalId) external;
    function cancel(uint256 proposalId) external;

    // Guardian Council
    function emergencyPause(string calldata reason) external;
    function emergencyUnpause() external;
    function veto(uint256 proposalId) external;

    // Views
    function getProposal(uint256 proposalId) external view returns (DataStructures.Proposal memory);
    function getConviction(address voter) external view returns (uint256);
    function quorumRequired(DataStructures.ProposalType pType) external view returns (uint256);
    function approvalThreshold(DataStructures.ProposalType pType) external view returns (uint256);
    function paused() external view returns (bool);
}
```

### 4.7 contracts/interfaces/IKKlerosTimelock.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IKKlerosTimelock
 * @notice 거버넌스 결의 타임락 — 24h ~ 14d 지연 실행
 */
interface IKKlerosTimelock {

    event TransactionQueued(bytes32 indexed txHash, uint256 eta);
    event TransactionExecuted(bytes32 indexed txHash);
    event TransactionCancelled(bytes32 indexed txHash);

    function queueTransaction(address target, uint256 value, bytes calldata data, uint256 delay) external returns (bytes32 txHash);
    function executeTransaction(address target, uint256 value, bytes calldata data) external;
    function cancelTransaction(bytes32 txHash) external;

    function MIN_DELAY() external view returns (uint256);  // 24 hours
    function MAX_DELAY() external view returns (uint256);  // 14 days
}
```

## 5. Stub Implementations

For each contract, create a stub that imports the interface, inherits OpenZeppelin bases, and has `// TODO` for every function body. Example pattern:

### 5.1 contracts/core/KlerosCore.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IKlerosCore.sol";
import "../interfaces/IDisputeKit.sol";
import "../interfaces/ISortitionModule.sol";
import "../interfaces/IEscrowBridge.sol";
import "../libraries/DataStructures.sol";

/**
 * @title KlerosCore
 * @notice Main arbitration hub — ERC-792 IArbitrator implementation
 * @dev UUPS upgradeable. Coordinates DisputeKit, SortitionModule, EscrowBridge.
 *
 * Key parameters:
 *   - 4 courts: General(3 jurors, 1K stake), DeFi(5, 5K), NFT(3, 1K), DAO(7, 10K)
 *   - Fee: 3% of dispute amount (arbitrator 1%, jurors 1.2%, DAO 0.5%, ops 0.3%)
 *   - Minimum fee: 10 XRP equivalent
 *   - Evidence period: 14 days (extendable by arbitrator)
 *   - Dual Award writing: 21 days
 *   - Commit phase: 48 hours
 *   - Reveal phase: 24 hours
 *   - Appeal window: 7 days
 *   - Appeal jury multiplier: 2n+1
 *   - Appeal fee multiplier: round 1 = 2x, round 2 = 3x, round 3 = 4x
 *   - Max appeal rounds: 3
 */
contract KlerosCore is
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    IKlerosCore
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    IDisputeKit public disputeKit;
    ISortitionModule public sortitionModule;
    IEscrowBridge public escrowBridge;

    uint256 private _disputeCounter;
    mapping(uint256 => DataStructures.Dispute) private _disputes;
    mapping(DataStructures.CourtType => DataStructures.CourtConfig) private _courtConfigs;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _disputeKit,
        address _sortitionModule,
        address _escrowBridge,
        address _admin
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        disputeKit = IDisputeKit(_disputeKit);
        sortitionModule = ISortitionModule(_sortitionModule);
        escrowBridge = IEscrowBridge(_escrowBridge);
        _initCourts();
    }

    function _initCourts() internal {
        _courtConfigs[DataStructures.CourtType.General] = DataStructures.CourtConfig(3, 1000e18, 0, true);
        _courtConfigs[DataStructures.CourtType.DeFi] = DataStructures.CourtConfig(5, 5000e18, 0, true);
        _courtConfigs[DataStructures.CourtType.NFT] = DataStructures.CourtConfig(3, 1000e18, 0, true);
        _courtConfigs[DataStructures.CourtType.DAO] = DataStructures.CourtConfig(7, 10000e18, 0, true);
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    // ── IArbitrator (ERC-792) ──
    function createDispute(uint256 _choices, bytes calldata _extraData) external payable override nonReentrant whenNotPaused returns (uint256) {
        // TODO: implement
        revert("Not implemented");
    }

    function arbitrationCost(bytes calldata _extraData) external view override returns (uint256) {
        // TODO: implement
        return 0;
    }

    function appeal(uint256 _disputeID, bytes calldata _extraData) external payable override nonReentrant {
        // TODO: implement
        revert("Not implemented");
    }

    function appealCost(uint256 _disputeID, bytes calldata _extraData) external view override returns (uint256) {
        // TODO: implement
        return 0;
    }

    function appealPeriod(uint256 _disputeID) external view override returns (uint256, uint256) {
        // TODO: implement
        return (0, 0);
    }

    function currentRuling(uint256 _disputeID) external view override returns (uint256) {
        return _disputes[_disputeID].ruling;
    }

    // ── K-Kleros Extensions ──
    function assignArbitrator(uint256 _disputeID, address _arbitrator) external override onlyRole(ADMIN_ROLE) {
        // TODO: implement
    }

    function closeEvidencePeriod(uint256 _disputeID) external override {
        // TODO: implement
    }

    function signAward(uint256 _disputeID, bytes calldata _signature) external override {
        // TODO: implement
    }

    function executeRuling(uint256 _disputeID) external override nonReentrant {
        // TODO: implement
    }

    // ── Views ──
    function getDispute(uint256 _disputeID) external view override returns (DataStructures.Dispute memory) {
        return _disputes[_disputeID];
    }

    function getCourtConfig(DataStructures.CourtType _courtType) external view override returns (DataStructures.CourtConfig memory) {
        return _courtConfigs[_courtType];
    }

    function disputeCount() external view override returns (uint256) {
        return _disputeCounter;
    }
}
```

### 5.2 contracts/core/DisputeKit.sol — same pattern

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IDisputeKit.sol";
import "../libraries/DataStructures.sol";

/**
 * @title DisputeKit
 * @notice Dual-Award Commit-Reveal voting engine
 * @dev Commit: 48h, Reveal: 24h. Commit hash = keccak256(abi.encodePacked(choice, salt)).
 */
contract DisputeKit is AccessControlUpgradeable, UUPSUpgradeable, IDisputeKit {

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE"); // KlerosCore
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    mapping(uint256 => DataStructures.DualAwardPackage) private _dualAwards;
    mapping(uint256 => mapping(uint256 => DataStructures.Round)) private _rounds;
    mapping(uint256 => mapping(address => bytes32)) private _commits;
    mapping(uint256 => mapping(address => bool)) private _hasCommitted;
    mapping(uint256 => mapping(address => bool)) private _hasRevealed;
    mapping(uint256 => uint256) private _currentRound;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function commitDualAward(uint256 _disputeID, bytes32 _awardAHash, bytes32 _awardBHash, bytes32 _casePackageRoot) external override {
        // TODO: verify caller is assigned arbitrator, status == DualAward
        revert("Not implemented");
    }

    function startVoting(uint256 _disputeID, address[] calldata _jurors, uint256 _roundNumber) external override onlyRole(OPERATOR_ROLE) {
        // TODO: implement — set commitDeadline = block.timestamp + 48h, revealDeadline = commitDeadline + 24h
        revert("Not implemented");
    }

    function commitVote(uint256 _disputeID, bytes32 _commit) external override {
        // TODO: verify juror is drawn, within commit phase, not already committed
        revert("Not implemented");
    }

    function revealVote(uint256 _disputeID, uint256 _choice, uint256 _salt) external override {
        // TODO: verify keccak256(abi.encodePacked(_choice, _salt)) == _commits[disputeID][msg.sender]
        revert("Not implemented");
    }

    function tallyVotes(uint256 _disputeID) external override onlyRole(OPERATOR_ROLE) returns (uint256) {
        // TODO: implement — majority wins, tie → TieDetected event
        revert("Not implemented");
    }

    function resolveTie(uint256 _disputeID, uint256 _ruling) external override {
        // TODO: verify caller is arbitrator, tie exists
        revert("Not implemented");
    }

    // Views
    function getVoteCount(uint256 _disputeID, uint256 _roundNumber) external view override returns (uint256, uint256, uint256) {
        DataStructures.Round storage r = _rounds[_disputeID][_roundNumber];
        return (r.votesA, r.votesB, r.votesRefused);
    }

    function getDualAwardPackage(uint256 _disputeID) external view override returns (DataStructures.DualAwardPackage memory) {
        return _dualAwards[_disputeID];
    }

    function hasCommitted(uint256 _disputeID, address _juror) external view override returns (bool) {
        return _hasCommitted[_disputeID][_juror];
    }

    function hasRevealed(uint256 _disputeID, address _juror) external view override returns (bool) {
        return _hasRevealed[_disputeID][_juror];
    }

    function getRound(uint256 _disputeID, uint256 _roundNumber) external view override returns (DataStructures.Round memory) {
        return _rounds[_disputeID][_roundNumber];
    }
}
```

### 5.3–5.7: Create similar stubs for:

- **contracts/modules/SortitionModule.sol** — AccessControlUpgradeable, UUPSUpgradeable, ISortitionModule. Key state: `mapping(address => mapping(uint96 => uint256)) stakes`, `mapping(uint96 => uint256) totalStaked`, unstake cooldown = 7 days, slashing rate = 10% (1000 bps). Import IKPNKToken for transferFrom/setTransferRestriction.

- **contracts/modules/EscrowBridge.sol** — AccessControlUpgradeable, UUPSUpgradeable, IEscrowBridge. Import `AxelarExecutable` from `@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol`. Key state: `mapping(bytes32 => DataStructures.Escrow) escrows`, `mapping(uint256 => bytes32) disputeToEscrow`. MAX_RETRY = 5. Fee rate = 300 bps (3%).

- **contracts/token/KPNKToken.sol** — ERC20Upgradeable, ERC20VotesUpgradeable, ERC20PermitUpgradeable, UUPSUpgradeable, IKPNKToken. TOTAL_SUPPLY = 1_000_000_000e18. Transfer restriction: mapping(address => bool). `_update()` override to check restriction.

- **contracts/governance/KKlerosGovernor.sol** — AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable, IKKlerosGovernor. GUARDIAN_ROLE for emergency functions. Conviction formula: `kpnkStaked * log2(1 + stakingDays)` (use lookup table for gas efficiency). Vote cap = 5%. Proposal bond = 10_000e18 K-PNK.

- **contracts/governance/KKlerosTimelock.sol** — AccessControlUpgradeable, IKKlerosTimelock. MIN_DELAY = 24 hours, MAX_DELAY = 14 days. Only Governor can queue/execute/cancel.

For each, follow the exact pattern from KlerosCore.sol: UUPS proxy, constructor disables initializers, initialize() function, `_authorizeUpgrade`, all interface functions with `// TODO` and `revert("Not implemented")`, view functions return storage directly.

## 6. Mock Contracts

### contracts/mocks/MockArbitrable.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IKlerosCore.sol";

contract MockArbitrable {
    IKlerosCore public arbitrator;
    mapping(uint256 => uint256) public rulings;

    constructor(address _arbitrator) {
        arbitrator = IKlerosCore(_arbitrator);
    }

    function createDispute(bytes calldata _extraData) external payable returns (uint256) {
        return arbitrator.createDispute{value: msg.value}(2, _extraData);
    }

    function rule(uint256 _disputeID, uint256 _ruling) external {
        require(msg.sender == address(arbitrator), "Only arbitrator");
        rulings[_disputeID] = _ruling;
    }
}
```

### contracts/mocks/MockAxelarGateway.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockAxelarGateway {
    event ContractCall(string destinationChain, string contractAddress, bytes payload);

    function callContract(string calldata destinationChain, string calldata contractAddress, bytes calldata payload) external {
        emit ContractCall(destinationChain, contractAddress, payload);
    }

    function validateContractCall(bytes32, string calldata, string calldata, bytes32) external pure returns (bool) {
        return true;
    }
}
```

## 7. Test Helpers — test/helpers/setup.ts

```typescript
import { ethers, upgrades } from "hardhat";

export async function deployFullSuite() {
  const [admin, arbitrator, juror1, juror2, juror3, claimant, respondent] = await ethers.getSigners();

  // 1. Deploy KPNKToken
  const KPNKToken = await ethers.getContractFactory("KPNKToken");
  const kpnk = await upgrades.deployProxy(KPNKToken, [admin.address], { kind: "uups" });
  await kpnk.waitForDeployment();

  // 2. Deploy SortitionModule
  const SortitionModule = await ethers.getContractFactory("SortitionModule");
  const sortition = await upgrades.deployProxy(SortitionModule, [await kpnk.getAddress(), admin.address], { kind: "uups" });
  await sortition.waitForDeployment();

  // 3. Deploy DisputeKit
  const DisputeKit = await ethers.getContractFactory("DisputeKit");
  const disputeKit = await upgrades.deployProxy(DisputeKit, [admin.address], { kind: "uups" });
  await disputeKit.waitForDeployment();

  // 4. Deploy MockAxelarGateway
  const MockGateway = await ethers.getContractFactory("MockAxelarGateway");
  const gateway = await MockGateway.deploy();
  await gateway.waitForDeployment();

  // 5. Deploy KlerosCore
  const KlerosCore = await ethers.getContractFactory("KlerosCore");
  const core = await upgrades.deployProxy(KlerosCore, [
    await disputeKit.getAddress(),
    await sortition.getAddress(),
    ethers.ZeroAddress, // EscrowBridge — set after
    admin.address
  ], { kind: "uups" });
  await core.waitForDeployment();

  // 6. Deploy EscrowBridge
  const EscrowBridge = await ethers.getContractFactory("EscrowBridge");
  const escrow = await upgrades.deployProxy(EscrowBridge, [
    await core.getAddress(),
    await gateway.getAddress(),
    admin.address
  ], { kind: "uups" });
  await escrow.waitForDeployment();

  // 7. Deploy Governor + Timelock
  const Timelock = await ethers.getContractFactory("KKlerosTimelock");
  const timelock = await upgrades.deployProxy(Timelock, [admin.address], { kind: "uups" });
  await timelock.waitForDeployment();

  const Governor = await ethers.getContractFactory("KKlerosGovernor");
  const governor = await upgrades.deployProxy(Governor, [
    await kpnk.getAddress(),
    await timelock.getAddress(),
    admin.address
  ], { kind: "uups" });
  await governor.waitForDeployment();

  // 8. Wire up cross-references
  // core.setEscrowBridge(escrow), grant OPERATOR_ROLE, etc.

  return { admin, arbitrator, juror1, juror2, juror3, claimant, respondent, kpnk, sortition, disputeKit, core, escrow, gateway, governor, timelock };
}
```

## 8. Test Stubs — create each test file with this pattern:

```typescript
// test/KlerosCore.test.ts
import { expect } from "chai";
import { deployFullSuite } from "./helpers/setup";

describe("KlerosCore", function () {
  it("should deploy and initialize correctly", async function () {
    const { core } = await deployFullSuite();
    expect(await core.disputeCount()).to.equal(0);
  });

  it("should have 4 courts configured", async function () {
    const { core } = await deployFullSuite();
    const general = await core.getCourtConfig(0); // General
    expect(general.minJurors).to.equal(3);
    expect(general.active).to.be.true;
  });

  // TODO: createDispute, assignArbitrator, closeEvidencePeriod, signAward, executeRuling, appeal
});
```

Create similar stubs for all 7 test files. Each should import deployFullSuite and have at least one deployment test + TODO comments for full test coverage.

## 9. hardhat.config.ts

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    xrplEvmTestnet: {
      url: "https://rpc-evm-sidechain-testnet.xrpl.org",
      chainId: 1440001,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    xrplEvmMainnet: {
      url: "https://rpc-evm-sidechain.xrpl.org",
      chainId: 1440002,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
  },
};

export default config;
```

## 10. scripts/deploy.ts

```typescript
import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. KPNKToken
  const KPNKToken = await ethers.getContractFactory("KPNKToken");
  const kpnk = await upgrades.deployProxy(KPNKToken, [deployer.address], { kind: "uups" });
  await kpnk.waitForDeployment();
  console.log("KPNKToken:", await kpnk.getAddress());

  // 2. SortitionModule
  const SortitionModule = await ethers.getContractFactory("SortitionModule");
  const sortition = await upgrades.deployProxy(SortitionModule, [await kpnk.getAddress(), deployer.address], { kind: "uups" });
  await sortition.waitForDeployment();
  console.log("SortitionModule:", await sortition.getAddress());

  // 3. DisputeKit
  const DisputeKit = await ethers.getContractFactory("DisputeKit");
  const disputeKit = await upgrades.deployProxy(DisputeKit, [deployer.address], { kind: "uups" });
  await disputeKit.waitForDeployment();
  console.log("DisputeKit:", await disputeKit.getAddress());

  // 4. KlerosCore (EscrowBridge = ZeroAddress, set later)
  const KlerosCore = await ethers.getContractFactory("KlerosCore");
  const core = await upgrades.deployProxy(KlerosCore, [
    await disputeKit.getAddress(),
    await sortition.getAddress(),
    ethers.ZeroAddress,
    deployer.address
  ], { kind: "uups" });
  await core.waitForDeployment();
  console.log("KlerosCore:", await core.getAddress());

  // 5. EscrowBridge (needs Axelar Gateway address for target network)
  // const AXELAR_GATEWAY = "0x..."; // Set per network
  // const EscrowBridge = await ethers.getContractFactory("EscrowBridge");
  // const escrow = await upgrades.deployProxy(EscrowBridge, [await core.getAddress(), AXELAR_GATEWAY, deployer.address], { kind: "uups" });

  // 6. KKlerosTimelock
  const Timelock = await ethers.getContractFactory("KKlerosTimelock");
  const timelock = await upgrades.deployProxy(Timelock, [deployer.address], { kind: "uups" });
  await timelock.waitForDeployment();
  console.log("KKlerosTimelock:", await timelock.getAddress());

  // 7. KKlerosGovernor
  const Governor = await ethers.getContractFactory("KKlerosGovernor");
  const governor = await upgrades.deployProxy(Governor, [
    await kpnk.getAddress(),
    await timelock.getAddress(),
    deployer.address
  ], { kind: "uups" });
  await governor.waitForDeployment();
  console.log("KKlerosGovernor:", await governor.getAddress());

  // 8. Wire access control
  // TODO: Grant OPERATOR_ROLE on SortitionModule/DisputeKit to KlerosCore
  // TODO: Grant TRANSFER_CONTROLLER_ROLE on KPNKToken to SortitionModule
  // TODO: Set EscrowBridge on KlerosCore
  // TODO: Grant GOVERNOR_ROLE on KlerosCore to Governor

  console.log("\n✅ Deployment complete. Remember to wire access control roles.");
}

main().catch(console.error);
```

## 11. Configuration Files

### .env.example

```
DEPLOYER_PRIVATE_KEY=
REPORT_GAS=true
AXELAR_GATEWAY_TESTNET=
AXELAR_GATEWAY_MAINNET=
```

### .gitignore (append to existing)

```
node_modules/
cache/
artifacts/
typechain-types/
coverage/
coverage.json
.env
```

### .solhint.json

```json
{
  "extends": "solhint:recommended",
  "rules": {
    "compiler-version": ["error", "^0.8.20"],
    "func-visibility": ["warn", { "ignoreConstructors": true }],
    "not-rely-on-time": "off",
    "reason-string": ["warn", { "maxLength": 64 }]
  }
}
```

## 12. Final Steps

```bash
# Compile to verify everything
npx hardhat compile

# Run tests (stubs should at least deploy)
npx hardhat test

# Stage and commit
git add -A
git commit -m "feat: scaffold Hardhat project with 7 contract interfaces + stubs

- DataStructures library with all enums and structs
- 7 interface files: IKlerosCore, IDisputeKit, ISortitionModule, IKPNKToken, IEscrowBridge, IKKlerosGovernor, IKKlerosTimelock
- UUPS-upgradeable stub implementations for all 7 contracts
- Mock contracts: MockArbitrable, MockAxelarGateway
- Test suite stubs with deployment helper
- Deployment scripts for local/testnet/mainnet
- hardhat.config.ts with XRPL EVM Sidechain network config (Chain ID 1440002/1440001)
- OpenZeppelin v5.x + Axelar GMP SDK dependencies"

# Push and create PR
git push -u origin feat/hardhat-scaffold
gh pr create --title "feat: Hardhat scaffold with 7 contract interfaces" --body "## Summary
- Complete Hardhat TypeScript project structure
- 7 Solidity interfaces extracted from design docs (DESIGN-ARCH-001, DESIGN-GOV-001)
- DataStructures library with all shared enums/structs
- UUPS-upgradeable stub implementations (TODO function bodies)
- Mock contracts for testing
- Deployment script with correct wiring order
- XRPL EVM Sidechain network config

## Next PRs
1. KPNKToken full implementation + tests
2. SortitionModule full implementation + tests
3. DisputeKit full implementation + tests
4. KlerosCore full implementation + tests
5. EscrowBridge full implementation + tests
6. KKlerosGovernor + KKlerosTimelock full implementation
7. Integration tests (full dispute lifecycle)

## Design References
- DESIGN-ARCH-001: Contract interfaces
- DESIGN-PROC-001: Dual-Award procedure
- DESIGN-ECON-001: Token economics
- DESIGN-GOV-001: DAO governance
- DESIGN-BRIDGE-001: XRPL escrow integration"
```

## KEY PARAMETERS REFERENCE

For implementation, these are the authoritative values:

| Parameter | Value |
|-----------|-------|
| Solidity | ^0.8.20 |
| Chain ID (Mainnet) | 1440002 |
| Chain ID (Testnet) | 1440001 |
| K-PNK Total Supply | 1,000,000,000 (1B) |
| K-PNK Decimals | 18 |
| Fee Rate | 3% (300 bps) |
| Minimum Fee | 10 XRP |
| Slashing Rate | 10% (1000 bps) |
| Reward Multiplier | 1.5x |
| Unstaking Cooldown | 7 days |
| Evidence Period | 14 days |
| Dual Award Period | 21 days |
| Commit Phase | 48 hours |
| Reveal Phase | 24 hours |
| Appeal Window | 7 days |
| Max Appeals | 3 |
| Appeal Jury Formula | 2n+1 |
| Appeal Fee Multipliers | 2x, 3x, 4x |
| Vote Cap (governance) | 5% |
| Proposal Bond | 10,000 K-PNK |
| Timelock MIN_DELAY | 24 hours |
| Timelock MAX_DELAY | 14 days |
| Guardian Council | 5/9 multisig |
| Emergency Pause Max | 72 hours |
| GMP Retry Max | 5 |
| Court: General | 3 jurors, 1K stake |
| Court: DeFi | 5 jurors, 5K stake |
| Court: NFT | 3 jurors, 1K stake |
| Court: DAO | 7 jurors, 10K stake |

## DEPLOYMENT ORDER (CRITICAL)

1. KPNKToken
2. SortitionModule (← KPNKToken address)
3. DisputeKit
4. KlerosCore (← DisputeKit, SortitionModule addresses)
5. EscrowBridge (← KlerosCore, Axelar Gateway addresses)
6. KKlerosTimelock
7. KKlerosGovernor (← KPNKToken, Timelock addresses)
8. Wire: KlerosCore.setEscrowBridge(EscrowBridge)
9. Wire: SortitionModule grant OPERATOR_ROLE → KlerosCore
10. Wire: DisputeKit grant OPERATOR_ROLE → KlerosCore
11. Wire: KPNKToken grant TRANSFER_CONTROLLER_ROLE → SortitionModule
12. Wire: KlerosCore grant GOVERNOR_ROLE → KKlerosGovernor
13. Register 4 court configs
14. Execute initial token distribution
```

## PROMPT END
