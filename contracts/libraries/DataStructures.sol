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
