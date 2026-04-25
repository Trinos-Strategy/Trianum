// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IDisputeKit.sol";
import "../libraries/DataStructures.sol";

/**
 * @title DisputeKit
 * @notice Trianum 듀얼 어워드 + Commit-Reveal 투표 엔진
 * @dev UUPS proxy. Called by KlerosCore for voting lifecycle.
 *
 * Voting Flow:
 *   1. Arbitrator commits DualAward (Award A hash, Award B hash, Case Package root)
 *   2. KlerosCore calls startVoting() with drawn jurors
 *   3. Jurors commitVote() within 48h (hash of choice+salt)
 *   4. Jurors revealVote() within 24h (choice+salt, verified against commit)
 *   5. KlerosCore calls tallyVotes() → returns ruling (0/1/2)
 *   6. If tie → arbitrator calls resolveTie()
 *
 * Security Invariants:
 *   - commitHash == keccak256(abi.encodePacked(choice, salt))
 *   - choice ∈ {0, 1, 2}
 *   - 1 juror = 1 vote per round
 *   - Cannot reveal without prior commit
 *   - Time-bound: commit within commitDeadline, reveal within revealDeadline
 */
contract DisputeKit is
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IDisputeKit
{
    // ══════════════════════════════════════════════
    //                  CONSTANTS
    // ══════════════════════════════════════════════

    bytes32 public constant KLEROS_CORE_ROLE = keccak256("KLEROS_CORE_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public constant COMMIT_DURATION = 48 hours;
    uint256 public constant REVEAL_DURATION = 24 hours;

    // ══════════════════════════════════════════════
    //                  STATE VARIABLES
    // ══════════════════════════════════════════════

    /// @dev KlerosCore address (for arbitrator lookup)
    address public klerosCore;

    /// @dev Dual Award packages: disputeID => DualAwardPackage
    mapping(uint256 => DataStructures.DualAwardPackage) private _dualAwards;

    /// @dev Rounds: disputeID => roundNumber => Round
    mapping(uint256 => mapping(uint256 => DataStructures.Round)) private _rounds;

    /// @dev Current round number per dispute
    mapping(uint256 => uint256) private _currentRound;

    /// @dev Vote commits: disputeID => roundNumber => juror => commitHash
    mapping(uint256 => mapping(uint256 => mapping(address => bytes32))) private _commits;

    /// @dev Whether juror has committed: disputeID => roundNumber => juror => bool
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) private _hasCommitted;

    /// @dev Whether juror has revealed: disputeID => roundNumber => juror => bool
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) private _hasRevealed;

    /// @dev Whether juror is drawn for this round: disputeID => roundNumber => juror => bool
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) private _isJuror;

    /// @dev Tie state: disputeID => roundNumber => hasTie
    mapping(uint256 => mapping(uint256 => bool)) private _hasTie;

    /// @dev Arbitrator address per dispute (cached from KlerosCore)
    mapping(uint256 => address) private _disputeArbitrator;

    // ══════════════════════════════════════════════
    //                  ERRORS
    // ══════════════════════════════════════════════

    error DualAwardAlreadyCommitted(uint256 disputeID);
    error DualAwardNotCommitted(uint256 disputeID);
    error InvalidHashes();
    error NotArbitratorOfDispute(uint256 disputeID, address caller);
    error NotJurorOfRound(uint256 disputeID, address caller);
    error AlreadyCommitted(uint256 disputeID, address juror);
    error AlreadyRevealed(uint256 disputeID, address juror);
    error NotCommitted(uint256 disputeID, address juror);
    error CommitPeriodExpired(uint256 disputeID);
    error CommitPeriodNotExpired(uint256 disputeID);
    error RevealPeriodExpired(uint256 disputeID);
    error RevealPeriodNotStarted(uint256 disputeID);
    error InvalidChoice(uint256 choice);
    error CommitHashMismatch(uint256 disputeID, address juror);
    error RoundNotTallied(uint256 disputeID, uint256 roundNumber);
    error RoundAlreadyTallied(uint256 disputeID, uint256 roundNumber);
    error NoTieDetected(uint256 disputeID, uint256 roundNumber);
    error TieAlreadyResolved(uint256 disputeID, uint256 roundNumber);
    error InvalidRuling(uint256 ruling);
    error ZeroAddress();
    error NoJurorsProvided();

    // ══════════════════════════════════════════════
    //                  MODIFIERS
    // ══════════════════════════════════════════════

    modifier onlyDisputeArbitrator(uint256 _disputeID) {
        if (_disputeArbitrator[_disputeID] != msg.sender)
            revert NotArbitratorOfDispute(_disputeID, msg.sender);
        _;
    }

    modifier onlyRoundJuror(uint256 _disputeID) {
        uint256 round = _currentRound[_disputeID];
        if (!_isJuror[_disputeID][round][msg.sender])
            revert NotJurorOfRound(_disputeID, msg.sender);
        _;
    }

    // ══════════════════════════════════════════════
    //              CONSTRUCTOR + INIT
    // ══════════════════════════════════════════════

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _admin,
        address _klerosCore
    ) external initializer {
        if (_admin == address(0) || _klerosCore == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(KLEROS_CORE_ROLE, _klerosCore);

        klerosCore = _klerosCore;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ══════════════════════════════════════════════
    //          ARBITRATOR: DUAL AWARD COMMIT
    // ══════════════════════════════════════════════

    /**
     * @notice 듀얼 어워드 패키지를 온체인 커밋
     * @dev 중재인이 21일 작성 기간 내에 호출
     *      Award A (청구인 승) + Award B (피신청인 승) 해시 + Case Package 루트
     * @param _disputeID 분쟁 ID
     * @param _awardAHash keccak256 of Award A IPFS CID
     * @param _awardBHash keccak256 of Award B IPFS CID
     * @param _casePackageRoot IPFS CID of entire Case Package
     */
    function commitDualAward(
        uint256 _disputeID,
        bytes32 _awardAHash,
        bytes32 _awardBHash,
        bytes32 _casePackageRoot
    ) external override onlyDisputeArbitrator(_disputeID) {
        DataStructures.DualAwardPackage storage pkg = _dualAwards[_disputeID];

        if (pkg.committed) revert DualAwardAlreadyCommitted(_disputeID);
        if (_awardAHash == bytes32(0) || _awardBHash == bytes32(0) || _casePackageRoot == bytes32(0))
            revert InvalidHashes();
        if (_awardAHash == _awardBHash) revert InvalidHashes(); // A and B must differ

        pkg.awardAHash = _awardAHash;
        pkg.awardBHash = _awardBHash;
        pkg.casePackageRoot = _casePackageRoot;
        pkg.committedAt = block.timestamp;
        pkg.committed = true;

        emit DualAwardCommitted(_disputeID, _awardAHash, _awardBHash, _casePackageRoot);
    }

    // ══════════════════════════════════════════════
    //          VOTING LIFECYCLE
    // ══════════════════════════════════════════════

    /**
     * @notice 투표 라운드 시작 (KlerosCore만 호출)
     * @dev 추첨된 배심원 등록 + Commit/Reveal 마감 설정
     * @param _disputeID 분쟁 ID
     * @param _jurors 추첨된 배심원 주소 배열
     * @param _roundNumber 라운드 번호 (0=원심, 1+=항소)
     */
    function startVoting(
        uint256 _disputeID,
        address[] calldata _jurors,
        uint256 _roundNumber
    ) external override onlyRole(KLEROS_CORE_ROLE) {
        if (_jurors.length == 0) revert NoJurorsProvided();

        // DualAward must be committed before voting can start
        if (!_dualAwards[_disputeID].committed) revert DualAwardNotCommitted(_disputeID);

        DataStructures.Round storage r = _rounds[_disputeID][_roundNumber];
        r.disputeID = _disputeID;
        r.roundNumber = _roundNumber;
        r.jurors = _jurors;
        r.commitDeadline = block.timestamp + COMMIT_DURATION;
        r.revealDeadline = block.timestamp + COMMIT_DURATION + REVEAL_DURATION;
        r.tallied = false;

        // Register jurors for this round
        for (uint256 i = 0; i < _jurors.length; i++) {
            _isJuror[_disputeID][_roundNumber][_jurors[i]] = true;
        }

        _currentRound[_disputeID] = _roundNumber;

        emit VotingStarted(_disputeID, _roundNumber, r.commitDeadline, r.revealDeadline);
    }

    /**
     * @notice 배심원 투표 커밋
     * @dev Commit Phase (48h) 내에서만 가능
     *      commit = keccak256(abi.encodePacked(choice, salt))
     *      1인 1투표 — 재커밋 불가
     * @param _disputeID 분쟁 ID
     * @param _commit 투표 해시
     */
    function commitVote(uint256 _disputeID, bytes32 _commit)
        external
        override
        onlyRoundJuror(_disputeID)
    {
        uint256 round = _currentRound[_disputeID];
        DataStructures.Round storage r = _rounds[_disputeID][round];

        // Time check: within commit period
        if (block.timestamp > r.commitDeadline)
            revert CommitPeriodExpired(_disputeID);

        // 1 juror = 1 commit
        if (_hasCommitted[_disputeID][round][msg.sender])
            revert AlreadyCommitted(_disputeID, msg.sender);

        _commits[_disputeID][round][msg.sender] = _commit;
        _hasCommitted[_disputeID][round][msg.sender] = true;

        emit VoteCommitted(_disputeID, msg.sender, _commit);
    }

    /**
     * @notice 배심원 투표 공개 (Reveal)
     * @dev Reveal Phase (24h) 내에서만 가능
     *      keccak256(abi.encodePacked(choice, salt)) must == committed hash
     *      choice ∈ {0, 1, 2}: 0=Refused, 1=AwardA, 2=AwardB
     *
     * Security: Reveal failure (미공개) → 해당 투표 무효 + 100% 슬래싱 (KlerosCore에서 처리)
     *
     * @param _disputeID 분쟁 ID
     * @param _choice 투표 선택 (0/1/2)
     * @param _salt 커밋 시 사용한 랜덤 값
     */
    function revealVote(uint256 _disputeID, uint256 _choice, uint256 _salt)
        external
        override
        onlyRoundJuror(_disputeID)
    {
        uint256 round = _currentRound[_disputeID];
        DataStructures.Round storage r = _rounds[_disputeID][round];

        // Time check: after commit deadline, within reveal deadline
        if (block.timestamp <= r.commitDeadline)
            revert RevealPeriodNotStarted(_disputeID);
        if (block.timestamp > r.revealDeadline)
            revert RevealPeriodExpired(_disputeID);

        // Must have committed
        if (!_hasCommitted[_disputeID][round][msg.sender])
            revert NotCommitted(_disputeID, msg.sender);

        // Cannot reveal twice
        if (_hasRevealed[_disputeID][round][msg.sender])
            revert AlreadyRevealed(_disputeID, msg.sender);

        // Validate choice range
        if (_choice > 2) revert InvalidChoice(_choice);

        // Verify commit hash
        bytes32 expectedHash = keccak256(abi.encodePacked(_choice, _salt));
        if (expectedHash != _commits[_disputeID][round][msg.sender])
            revert CommitHashMismatch(_disputeID, msg.sender);

        // Record reveal
        _hasRevealed[_disputeID][round][msg.sender] = true;

        // Tally vote
        if (_choice == 0) {
            r.votesRefused++;
        } else if (_choice == 1) {
            r.votesA++;
        } else {
            r.votesB++;
        }

        emit VoteRevealed(_disputeID, msg.sender, _choice);
    }

    /**
     * @notice 투표 집계 (KlerosCore가 호출)
     * @dev Reveal 종료 후 호출. 다수결 판정.
     *
     * Ruling logic:
     *   - votesA > votesB → ruling = 1 (Award A, 청구인 승)
     *   - votesB > votesA → ruling = 2 (Award B, 피신청인 승)
     *   - votesA == votesB → tie detected, ruling = 0 (pending arbitrator resolveTie)
     *   - majority Refused → ruling = 0 (분쟁 거부)
     *
     * Edge cases:
     *   - 전원 미투표 (no reveals): ruling = 0 → KlerosCore handles re-draw + 100% slash
     *   - 일부 미공개: 유효 투표만 집계. KlerosCore가 미공개자 슬래싱 처리
     *
     * @param _disputeID 분쟁 ID
     * @return ruling 판정 결과 (0=refused/tie pending, 1=AwardA, 2=AwardB)
     */
    function tallyVotes(uint256 _disputeID)
        external
        override
        onlyRole(KLEROS_CORE_ROLE)
        returns (uint256 ruling)
    {
        uint256 round = _currentRound[_disputeID];
        DataStructures.Round storage r = _rounds[_disputeID][round];

        if (r.tallied) revert RoundAlreadyTallied(_disputeID, round);

        // Reveal period must be over
        require(block.timestamp > r.revealDeadline, "Reveal period not ended");

        r.tallied = true;

        uint256 totalValid = r.votesA + r.votesB + r.votesRefused;

        // Edge case: no votes at all
        if (totalValid == 0) {
            ruling = 0; // KlerosCore will re-draw + slash all jurors
            emit VotesTallied(_disputeID, round, 0, 0, 0, 0);
            return ruling;
        }

        // Check if majority refused
        if (r.votesRefused > r.votesA && r.votesRefused > r.votesB) {
            ruling = 0; // Dispute refused
        }
        // Check for tie between A and B
        else if (r.votesA == r.votesB) {
            _hasTie[_disputeID][round] = true;
            ruling = 0; // Tie — pending arbitrator resolution
            emit TieDetected(_disputeID, round);
        }
        // Clear winner
        else if (r.votesA > r.votesB) {
            ruling = 1; // Award A (claimant wins)
        } else {
            ruling = 2; // Award B (respondent wins)
        }

        emit VotesTallied(_disputeID, round, r.votesA, r.votesB, r.votesRefused, ruling);
        return ruling;
    }

    /**
     * @notice 동률 시 중재인 결정권 행사 (casting vote)
     * @dev Edge case §6.1: A:B 동률 → 중재인이 3일 내 1 또는 2 선택
     * @param _disputeID 분쟁 ID
     * @param _ruling 중재인 결정 (1=AwardA, 2=AwardB). 0(Refused) 불가.
     */
    function resolveTie(uint256 _disputeID, uint256 _ruling)
        external
        override
        onlyDisputeArbitrator(_disputeID)
    {
        uint256 round = _currentRound[_disputeID];

        if (!_hasTie[_disputeID][round])
            revert NoTieDetected(_disputeID, round);
        if (_ruling != 1 && _ruling != 2)
            revert InvalidRuling(_ruling);

        // Mark tie as resolved
        _hasTie[_disputeID][round] = false;

        emit TieResolved(_disputeID, _ruling, msg.sender);

        // Note: KlerosCore must call a function to update the dispute ruling
        // after resolveTie. This is a callback pattern — KlerosCore polls or
        // the arbitrator calls KlerosCore.signAward() with the resolved ruling.
    }

    // ══════════════════════════════════════════════
    //                VIEW FUNCTIONS
    // ══════════════════════════════════════════════

    function getVoteCount(uint256 _disputeID, uint256 _roundNumber)
        external view override
        returns (uint256 votesA, uint256 votesB, uint256 votesRefused)
    {
        DataStructures.Round storage r = _rounds[_disputeID][_roundNumber];
        return (r.votesA, r.votesB, r.votesRefused);
    }

    function getDualAwardPackage(uint256 _disputeID)
        external view override
        returns (DataStructures.DualAwardPackage memory)
    {
        return _dualAwards[_disputeID];
    }

    function hasCommitted(uint256 _disputeID, address _juror)
        external view override returns (bool)
    {
        uint256 round = _currentRound[_disputeID];
        return _hasCommitted[_disputeID][round][_juror];
    }

    function hasRevealed(uint256 _disputeID, address _juror)
        external view override returns (bool)
    {
        uint256 round = _currentRound[_disputeID];
        return _hasRevealed[_disputeID][round][_juror];
    }

    function getRound(uint256 _disputeID, uint256 _roundNumber)
        external view override
        returns (DataStructures.Round memory)
    {
        return _rounds[_disputeID][_roundNumber];
    }

    function getCurrentRound(uint256 _disputeID)
        external view override returns (uint256)
    {
        return _currentRound[_disputeID];
    }

    /**
     * @notice Check if a tie exists for a dispute round
     */
    function hasTie(uint256 _disputeID, uint256 _roundNumber)
        external view returns (bool)
    {
        return _hasTie[_disputeID][_roundNumber];
    }

    /**
     * @notice Get list of jurors who did NOT reveal (for slashing by KlerosCore)
     * @param _disputeID 분쟁 ID
     * @param _roundNumber 라운드 번호
     * @return nonRevealers 미공개 배심원 주소 배열
     */
    function getNonRevealers(uint256 _disputeID, uint256 _roundNumber)
        external view returns (address[] memory nonRevealers)
    {
        DataStructures.Round storage r = _rounds[_disputeID][_roundNumber];
        uint256 count = 0;

        // First pass: count non-revealers
        for (uint256 i = 0; i < r.jurors.length; i++) {
            if (_hasCommitted[_disputeID][_roundNumber][r.jurors[i]] &&
                !_hasRevealed[_disputeID][_roundNumber][r.jurors[i]]) {
                count++;
            }
        }

        // Second pass: collect
        nonRevealers = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < r.jurors.length; i++) {
            if (_hasCommitted[_disputeID][_roundNumber][r.jurors[i]] &&
                !_hasRevealed[_disputeID][_roundNumber][r.jurors[i]]) {
                nonRevealers[idx++] = r.jurors[i];
            }
        }
    }

    /**
     * @notice Get list of jurors who did NOT commit at all (for slashing)
     */
    function getNonCommitters(uint256 _disputeID, uint256 _roundNumber)
        external view returns (address[] memory nonCommitters)
    {
        DataStructures.Round storage r = _rounds[_disputeID][_roundNumber];
        uint256 count = 0;

        for (uint256 i = 0; i < r.jurors.length; i++) {
            if (!_hasCommitted[_disputeID][_roundNumber][r.jurors[i]]) {
                count++;
            }
        }

        nonCommitters = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < r.jurors.length; i++) {
            if (!_hasCommitted[_disputeID][_roundNumber][r.jurors[i]]) {
                nonCommitters[idx++] = r.jurors[i];
            }
        }
    }

    // ══════════════════════════════════════════════
    //              ADMIN FUNCTIONS
    // ══════════════════════════════════════════════

    function setKlerosCore(address _klerosCore) external onlyRole(ADMIN_ROLE) {
        if (_klerosCore == address(0)) revert ZeroAddress();
        klerosCore = _klerosCore;
        _grantRole(KLEROS_CORE_ROLE, _klerosCore);
    }

    /**
     * @notice Register arbitrator address for a dispute
     * @dev Called by KlerosCore when arbitrator is assigned
     */
    function setDisputeArbitrator(uint256 _disputeID, address _arbitrator)
        external onlyRole(KLEROS_CORE_ROLE)
    {
        _disputeArbitrator[_disputeID] = _arbitrator;
    }
}
