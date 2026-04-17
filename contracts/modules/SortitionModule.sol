// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ISortitionModule.sol";

/**
 * @title SortitionModule
 * @notice Stake-weighted jury selection, slashing, and reward execution.
 * @dev UUPS proxy. Called by KlerosCore for draw / penalize / reward.
 *
 * Staking:
 *   - Jurors stake K-PNK per court (0..N).
 *   - Unstake is two-phase with a 7d cooldown; requires no active disputes.
 *
 * Drawing (blockhash-based randomness for MVP):
 *   seed = keccak256(blockhash(last), disputeID, nonce)
 *   For each slot: rand = keccak(seed, i) % totalStaked[court]
 *                  pick juror whose cumulative-stake window contains rand
 *   Duplicates are skipped; caps at MAX_DRAW_ITERATIONS to bound gas.
 *
 * Slashing:
 *   penalize() applies a flat 10% cut to the juror's stake in the court the
 *   dispute was drawn from. Slashed K-PNK remains in this contract and funds
 *   future reward() payouts.
 *
 * Rewards:
 *   reward() is a simple token transfer — the reward multiplier (1.5x) is
 *   computed by KlerosCore before calling.
 */
contract SortitionModule is
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    ISortitionModule
{
    using SafeERC20 for IERC20;

    // ══════════════════════════════════════════════
    //                  CONSTANTS
    // ══════════════════════════════════════════════

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant KLEROS_CORE_ROLE = keccak256("KLEROS_CORE_ROLE");

    uint256 public constant UNSTAKING_COOLDOWN = 7 days;
    uint256 public constant SLASH_MINORITY_BPS = 1000;      // 10%
    uint256 public constant SLASH_NO_SHOW_BPS = 500;        // 5%   (reserved, Phase 2)
    uint256 public constant SLASH_REVEAL_FAIL_BPS = 1000;   // 10%  (reserved, Phase 2)
    uint256 public constant REWARD_MULTIPLIER_BPS = 15000;  // 1.5x (reserved, computed by core)
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_DRAW_ITERATIONS = 50;

    /// @dev Supported court range for MVP (0=General, 1=DeFi, 2=NFT, 3=DAO)
    uint96 public constant MAX_COURT_ID = 3;

    // ══════════════════════════════════════════════
    //                  TYPES
    // ══════════════════════════════════════════════

    struct UnstakeRequest {
        uint256 amount;
        uint256 availableAt; // timestamp when the request may be executed
    }

    // ══════════════════════════════════════════════
    //                  STATE
    // ══════════════════════════════════════════════

    IERC20 public kpnkToken;
    address public klerosCore;

    /// @dev juror => courtID => stake
    mapping(address => mapping(uint96 => uint256)) public jurorStakes;

    /// @dev courtID => total staked
    mapping(uint96 => uint256) public totalStaked;

    /// @dev juror => courtID => pending unstake request
    mapping(address => mapping(uint96 => UnstakeRequest)) public unstakeRequests;

    /// @dev juror => number of currently active disputes (blocks unstake while > 0)
    mapping(address => uint256) public activeDisputeCount;

    /// @dev courtID => ordered list of jurors staked in this court
    mapping(uint96 => address[]) internal _courtJurors;

    /// @dev juror => courtID => is the juror currently in _courtJurors
    mapping(address => mapping(uint96 => bool)) internal _isStakedInCourt;

    /// @dev juror => courtID => index in _courtJurors (only valid if _isStakedInCourt[j][c])
    mapping(address => mapping(uint96 => uint256)) internal _jurorIndexInCourt;

    /// @dev disputeID => juror => courtID the juror was drawn from (for penalize lookup)
    mapping(uint256 => mapping(address => uint96)) internal _disputeJurorCourt;

    /// @dev disputeID => juror => was drawn for this dispute (guards double-penalize)
    mapping(uint256 => mapping(address => bool)) internal _drawnForDispute;

    // ══════════════════════════════════════════════
    //                  ERRORS
    // ══════════════════════════════════════════════

    error ZeroAddress();
    error InvalidCourt(uint96 courtID);
    error ZeroAmount();
    error InsufficientStake(address juror, uint96 courtID, uint256 have, uint256 requested);
    error PendingUnstakeExists(address juror, uint96 courtID);
    error NoPendingUnstake(address juror, uint96 courtID);
    error CooldownNotElapsed(uint256 availableAt, uint256 nowTs);
    error JurorHasActiveDisputes(address juror, uint256 count);
    error NotEnoughJurors(uint96 courtID, uint256 available, uint256 requested);
    error DrawCountZero();
    error NotDrawnForDispute(address juror, uint256 disputeID);
    error InsufficientContractBalance(uint256 balance, uint256 requested);

    // ══════════════════════════════════════════════
    //              CONSTRUCTOR + INIT
    // ══════════════════════════════════════════════

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _admin,
        address _kpnkToken,
        address _klerosCore
    ) external initializer {
        if (_admin == address(0) || _kpnkToken == address(0) || _klerosCore == address(0))
            revert ZeroAddress();

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(KLEROS_CORE_ROLE, _klerosCore);

        kpnkToken = IERC20(_kpnkToken);
        klerosCore = _klerosCore;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ══════════════════════════════════════════════
    //                  STAKING
    // ══════════════════════════════════════════════

    /**
     * @inheritdoc ISortitionModule
     */
    function stake(uint96 _courtID, uint256 _amount) external override nonReentrant {
        if (_courtID > MAX_COURT_ID) revert InvalidCourt(_courtID);
        if (_amount == 0) revert ZeroAmount();

        kpnkToken.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 newStake = jurorStakes[msg.sender][_courtID] + _amount;
        jurorStakes[msg.sender][_courtID] = newStake;
        totalStaked[_courtID] += _amount;

        if (!_isStakedInCourt[msg.sender][_courtID]) {
            _jurorIndexInCourt[msg.sender][_courtID] = _courtJurors[_courtID].length;
            _courtJurors[_courtID].push(msg.sender);
            _isStakedInCourt[msg.sender][_courtID] = true;
        }

        emit Staked(msg.sender, _courtID, _amount, newStake);
    }

    /**
     * @inheritdoc ISortitionModule
     */
    function requestUnstake(uint96 _courtID, uint256 _amount) external override {
        if (_courtID > MAX_COURT_ID) revert InvalidCourt(_courtID);
        if (_amount == 0) revert ZeroAmount();

        uint256 currentStake = jurorStakes[msg.sender][_courtID];
        if (_amount > currentStake)
            revert InsufficientStake(msg.sender, _courtID, currentStake, _amount);

        if (unstakeRequests[msg.sender][_courtID].amount != 0)
            revert PendingUnstakeExists(msg.sender, _courtID);

        if (activeDisputeCount[msg.sender] != 0)
            revert JurorHasActiveDisputes(msg.sender, activeDisputeCount[msg.sender]);

        uint256 availableAt = block.timestamp + UNSTAKING_COOLDOWN;
        unstakeRequests[msg.sender][_courtID] = UnstakeRequest({
            amount: _amount,
            availableAt: availableAt
        });

        emit UnstakeRequested(msg.sender, _courtID, _amount, availableAt);
    }

    /**
     * @inheritdoc ISortitionModule
     */
    function executeUnstake(uint96 _courtID) external override nonReentrant {
        UnstakeRequest memory req = unstakeRequests[msg.sender][_courtID];
        if (req.amount == 0) revert NoPendingUnstake(msg.sender, _courtID);
        if (block.timestamp < req.availableAt)
            revert CooldownNotElapsed(req.availableAt, block.timestamp);
        if (activeDisputeCount[msg.sender] != 0)
            revert JurorHasActiveDisputes(msg.sender, activeDisputeCount[msg.sender]);

        // Guard against a slash that reduced stake below the requested amount
        uint256 have = jurorStakes[msg.sender][_courtID];
        uint256 amount = req.amount > have ? have : req.amount;

        jurorStakes[msg.sender][_courtID] = have - amount;
        totalStaked[_courtID] -= amount;

        delete unstakeRequests[msg.sender][_courtID];

        if (jurorStakes[msg.sender][_courtID] == 0) {
            _removeJurorFromCourt(msg.sender, _courtID);
        }

        kpnkToken.safeTransfer(msg.sender, amount);
        emit UnstakeExecuted(msg.sender, _courtID, amount);
    }

    // ══════════════════════════════════════════════
    //              DRAWING (KlerosCore only)
    // ══════════════════════════════════════════════

    /**
     * @inheritdoc ISortitionModule
     */
    function draw(
        uint256 _disputeID,
        uint96 _courtID,
        uint256 _count,
        uint256 _nonce
    ) external override onlyRole(KLEROS_CORE_ROLE) returns (address[] memory jurors) {
        if (_count == 0) revert DrawCountZero();
        if (_courtID > MAX_COURT_ID) revert InvalidCourt(_courtID);

        address[] storage pool = _courtJurors[_courtID];
        uint256 total = totalStaked[_courtID];

        if (pool.length < _count || total == 0)
            revert NotEnoughJurors(_courtID, pool.length, _count);

        jurors = new address[](_count);
        uint256 drawnCount;

        uint256 baseSeed = uint256(
            keccak256(abi.encodePacked(blockhash(block.number - 1), _disputeID, _nonce))
        );

        uint256 attempts;
        while (drawnCount < _count && attempts < MAX_DRAW_ITERATIONS) {
            uint256 rand = uint256(keccak256(abi.encodePacked(baseSeed, attempts))) % total;

            address picked = _pickByCumulativeStake(_courtID, rand);
            if (picked != address(0) && !_drawnForDispute[_disputeID][picked]) {
                jurors[drawnCount] = picked;
                drawnCount++;
                _drawnForDispute[_disputeID][picked] = true;
                _disputeJurorCourt[_disputeID][picked] = _courtID;
                activeDisputeCount[picked]++;
                emit JurorDrawn(_disputeID, picked, _courtID, 0);
            }
            unchecked { attempts++; }
        }

        if (drawnCount < _count)
            revert NotEnoughJurors(_courtID, drawnCount, _count);
    }

    /**
     * @dev Linear scan of _courtJurors using cumulative stake window.
     *      Returns address(0) only if court is empty (totalStaked would be 0 in that case).
     */
    function _pickByCumulativeStake(uint96 _courtID, uint256 _rand)
        internal
        view
        returns (address)
    {
        address[] storage pool = _courtJurors[_courtID];
        uint256 cumulative;
        uint256 len = pool.length;
        for (uint256 i = 0; i < len; i++) {
            address j = pool[i];
            cumulative += jurorStakes[j][_courtID];
            if (_rand < cumulative) return j;
        }
        return address(0);
    }

    // ══════════════════════════════════════════════
    //          PENALTY / REWARD (KlerosCore only)
    // ══════════════════════════════════════════════

    /**
     * @inheritdoc ISortitionModule
     * @dev Applies SLASH_MINORITY_BPS to the juror's stake in the dispute's court.
     */
    function penalize(address _juror, uint256 _disputeID)
        external
        override
        onlyRole(KLEROS_CORE_ROLE)
        returns (uint256 slashedAmount)
    {
        if (!_drawnForDispute[_disputeID][_juror])
            revert NotDrawnForDispute(_juror, _disputeID);

        uint96 courtID = _disputeJurorCourt[_disputeID][_juror];
        uint256 currentStake = jurorStakes[_juror][courtID];

        slashedAmount = (currentStake * SLASH_MINORITY_BPS) / BPS_DENOMINATOR;
        if (slashedAmount > currentStake) slashedAmount = currentStake;

        jurorStakes[_juror][courtID] = currentStake - slashedAmount;
        totalStaked[courtID] -= slashedAmount;

        if (jurorStakes[_juror][courtID] == 0 && _isStakedInCourt[_juror][courtID]) {
            _removeJurorFromCourt(_juror, courtID);
        }

        _clearDisputeAssignment(_disputeID, _juror);
        emit Slashed(_juror, _disputeID, slashedAmount);
    }

    /**
     * @inheritdoc ISortitionModule
     */
    function reward(address _juror, uint256 _disputeID, uint256 _amount)
        external
        override
        onlyRole(KLEROS_CORE_ROLE)
        nonReentrant
    {
        if (!_drawnForDispute[_disputeID][_juror])
            revert NotDrawnForDispute(_juror, _disputeID);

        uint256 bal = kpnkToken.balanceOf(address(this));
        if (_amount > bal) revert InsufficientContractBalance(bal, _amount);

        _clearDisputeAssignment(_disputeID, _juror);

        if (_amount > 0) {
            kpnkToken.safeTransfer(_juror, _amount);
        }
        emit Rewarded(_juror, _disputeID, _amount);
    }

    /**
     * @notice Release a juror from a dispute without penalty or reward.
     * @dev Used when a dispute settles / gets cancelled mid-flight. KlerosCore only.
     */
    function decrementActiveDispute(address _juror, uint256 _disputeID)
        external
        onlyRole(KLEROS_CORE_ROLE)
    {
        if (!_drawnForDispute[_disputeID][_juror])
            revert NotDrawnForDispute(_juror, _disputeID);
        _clearDisputeAssignment(_disputeID, _juror);
    }

    // ══════════════════════════════════════════════
    //                   VIEWS
    // ══════════════════════════════════════════════

    function getStake(address _juror, uint96 _courtID) external view override returns (uint256) {
        return jurorStakes[_juror][_courtID];
    }

    function getTotalStaked(uint96 _courtID) external view override returns (uint256) {
        return totalStaked[_courtID];
    }

    function getUnstakeRequest(address _juror, uint96 _courtID)
        external view override returns (uint256 amount, uint256 availableAt)
    {
        UnstakeRequest storage r = unstakeRequests[_juror][_courtID];
        return (r.amount, r.availableAt);
    }

    function isJurorActive(address _juror) external view override returns (bool) {
        return activeDisputeCount[_juror] > 0;
    }

    /// @notice Number of jurors currently staked in a court.
    function getCourtJurorCount(uint96 _courtID) external view returns (uint256) {
        return _courtJurors[_courtID].length;
    }

    /// @notice Read a juror address from the court pool by index.
    function getCourtJuror(uint96 _courtID, uint256 _index) external view returns (address) {
        return _courtJurors[_courtID][_index];
    }

    /// @notice Convenience view: was this juror drawn for this dispute?
    function wasDrawn(uint256 _disputeID, address _juror) external view returns (bool) {
        return _drawnForDispute[_disputeID][_juror];
    }

    // ══════════════════════════════════════════════
    //              ADMIN
    // ══════════════════════════════════════════════

    /// @notice Update the KlerosCore address (and role). Admin only.
    function setKlerosCore(address _klerosCore) external onlyRole(ADMIN_ROLE) {
        if (_klerosCore == address(0)) revert ZeroAddress();
        address old = klerosCore;
        if (old != address(0)) _revokeRole(KLEROS_CORE_ROLE, old);
        klerosCore = _klerosCore;
        _grantRole(KLEROS_CORE_ROLE, _klerosCore);
    }

    // ══════════════════════════════════════════════
    //              INTERNAL HELPERS
    // ══════════════════════════════════════════════

    function _clearDisputeAssignment(uint256 _disputeID, address _juror) internal {
        _drawnForDispute[_disputeID][_juror] = false;
        uint256 n = activeDisputeCount[_juror];
        if (n > 0) activeDisputeCount[_juror] = n - 1;
    }

    /// @dev Swap-and-pop removal from `_courtJurors[_courtID]`.
    function _removeJurorFromCourt(address _juror, uint96 _courtID) internal {
        uint256 idx = _jurorIndexInCourt[_juror][_courtID];
        address[] storage pool = _courtJurors[_courtID];
        uint256 last = pool.length - 1;
        if (idx != last) {
            address moved = pool[last];
            pool[idx] = moved;
            _jurorIndexInCourt[moved][_courtID] = idx;
        }
        pool.pop();
        _isStakedInCourt[_juror][_courtID] = false;
        delete _jurorIndexInCourt[_juror][_courtID];
    }
}
