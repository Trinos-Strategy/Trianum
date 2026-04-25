// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/ITRNToken.sol";

/**
 * @title TRNToken (Korean Pinakion)
 * @notice TRN Work Token for the Trianum dispute resolution protocol.
 * @dev This is a Work Token, NOT a security.
 *
 * Three uses only:
 *   1. Staking — jurors deposit into SortitionModule for case eligibility
 *   2. Governance — voting power via ERC20Votes delegation (capped at 5%)
 *   3. Court creation bond — 100,000 TRN collateral to propose new court (future)
 *
 * Explicit non-functions:
 *   - No protocol revenue distribution in TRN
 *   - No burn or buyback
 *   - No fee payments (all fees settle in RLUSD / XRP)
 *   - No native yield on staking (juror rewards are paid in RLUSD)
 *
 * Supply:
 *   - Fixed cap: 1,000,000,000 TRN (18 decimals)
 *   - Minted via batched `initialDistribution` — can be called multiple times
 *     by the DISTRIBUTOR_ROLE as long as the cumulative total stays ≤ cap.
 *
 * Transfer restrictions:
 *   - When a juror stakes, SortitionModule calls `setTransferRestriction(juror, true)`.
 *   - A restricted account can only move tokens TO the SortitionModule address.
 *   - When the juror fully unstakes, SortitionModule lifts the restriction.
 *
 * Governance cap:
 *   - `getVotesWithCap(account)` caps voting power at `TOTAL_SUPPLY * 5%`.
 *   - Uncapped `getVotes()` / `getPastVotes()` remain available per ERC20Votes.
 */
contract TRNToken is
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    ERC20VotesUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ITRNToken
{
    // ══════════════════════════════════════════════
    //                  CONSTANTS
    // ══════════════════════════════════════════════

    string private constant _NAME = "Korean Pinakion";
    string private constant _SYMBOL = "TRN";

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant VOTE_CAP_BPS = 500; // 5%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ══════════════════════════════════════════════
    //                   ROLES
    // ══════════════════════════════════════════════

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant SORTITION_MODULE_ROLE = keccak256("SORTITION_MODULE_ROLE");

    // ══════════════════════════════════════════════
    //                   STATE
    // ══════════════════════════════════════════════

    /// @dev Running total of tokens minted via `initialDistribution` (mirrors totalSupply
    ///      as long as no burns occur; kept explicitly for auditability and to decouple
    ///      the cap check from ERC20 internals).
    uint256 public totalDistributed;

    /// @dev Address authorized to receive transfers from restricted accounts (staking deposits).
    address public sortitionModuleAddress;

    /// @dev Transfer-restriction flag per account (managed by SortitionModule).
    mapping(address => bool) private _transferRestricted;

    // ══════════════════════════════════════════════
    //                   ERRORS
    // ══════════════════════════════════════════════

    error ZeroAddress();
    error ArrayLengthMismatch(uint256 recipientsLen, uint256 amountsLen);
    error DistributionExceedsSupply(uint256 distributed, uint256 requested, uint256 cap);
    error TransferRestrictedForAccount(address from, address to);
    error EmptyDistribution();

    // ══════════════════════════════════════════════
    //              CONSTRUCTOR + INIT
    // ══════════════════════════════════════════════

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _admin) external initializer {
        if (_admin == address(0)) revert ZeroAddress();

        __ERC20_init(_NAME, _SYMBOL);
        __ERC20Permit_init(_NAME);
        __ERC20Votes_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(DISTRIBUTOR_ROLE, _admin);
        // NOTE: no minting here — use `initialDistribution` to seed balances.
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ══════════════════════════════════════════════
    //              ADMIN
    // ══════════════════════════════════════════════

    /// @notice Register the SortitionModule address and grant it SORTITION_MODULE_ROLE.
    /// @dev Stored address is the whitelist target for transfers from restricted accounts.
    function setSortitionModule(address _sortitionModule) external onlyRole(ADMIN_ROLE) {
        if (_sortitionModule == address(0)) revert ZeroAddress();
        address old = sortitionModuleAddress;
        if (old != address(0)) _revokeRole(SORTITION_MODULE_ROLE, old);
        sortitionModuleAddress = _sortitionModule;
        _grantRole(SORTITION_MODULE_ROLE, _sortitionModule);
    }

    /// @notice Revoke DISTRIBUTOR_ROLE from an account — used after initial distribution
    ///         is complete to lock minting permanently.
    function revokeDistributorRole(address _account) external onlyRole(ADMIN_ROLE) {
        _revokeRole(DISTRIBUTOR_ROLE, _account);
    }

    // ══════════════════════════════════════════════
    //              INITIAL DISTRIBUTION
    // ══════════════════════════════════════════════

    /// @inheritdoc ITRNToken
    function initialDistribution(
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external override onlyRole(DISTRIBUTOR_ROLE) {
        uint256 len = _recipients.length;
        if (len == 0) revert EmptyDistribution();
        if (len != _amounts.length) revert ArrayLengthMismatch(len, _amounts.length);

        uint256 batchTotal;
        for (uint256 i = 0; i < len; i++) {
            batchTotal += _amounts[i];
        }

        uint256 newTotal = totalDistributed + batchTotal;
        if (newTotal > TOTAL_SUPPLY)
            revert DistributionExceedsSupply(totalDistributed, batchTotal, TOTAL_SUPPLY);

        totalDistributed = newTotal;

        for (uint256 i = 0; i < len; i++) {
            _mint(_recipients[i], _amounts[i]);
        }

        emit InitialDistributionCompleted(len, batchTotal);
    }

    // ══════════════════════════════════════════════
    //              TRANSFER CONTROL
    // ══════════════════════════════════════════════

    /// @inheritdoc ITRNToken
    function setTransferRestriction(address _account, bool _restricted)
        external
        override
        onlyRole(SORTITION_MODULE_ROLE)
    {
        _transferRestricted[_account] = _restricted;
        emit TransferRestrictionChanged(_account, _restricted);
    }

    /// @inheritdoc ITRNToken
    function isTransferRestricted(address _account) external view override returns (bool) {
        return _transferRestricted[_account];
    }

    // ══════════════════════════════════════════════
    //              GOVERNANCE VIEW
    // ══════════════════════════════════════════════

    /// @inheritdoc ITRNToken
    /// @dev Caps voting power at TOTAL_SUPPLY * VOTE_CAP_BPS / BPS_DENOMINATOR (5%).
    ///      Uncapped `getVotes` / `getPastVotes` remain available for accounting.
    function getVotesWithCap(address _account) external view override returns (uint256) {
        uint256 votes = getVotes(_account);
        uint256 cap = (TOTAL_SUPPLY * VOTE_CAP_BPS) / BPS_DENOMINATOR;
        return votes > cap ? cap : votes;
    }

    // ══════════════════════════════════════════════
    //          OPENZEPPELIN v5 REQUIRED OVERRIDES
    // ══════════════════════════════════════════════

    /// @dev Enforces transfer restrictions AND propagates ERC20Votes checkpoint updates.
    ///      Minting (`from == 0`) and burning (`to == 0`) bypass the restriction check.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20VotesUpgradeable)
    {
        if (from != address(0) && _transferRestricted[from]) {
            // Restricted account: only transfers to SortitionModule (staking) are allowed.
            if (to != sortitionModuleAddress) {
                revert TransferRestrictedForAccount(from, to);
            }
        }
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20PermitUpgradeable, NoncesUpgradeable)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
