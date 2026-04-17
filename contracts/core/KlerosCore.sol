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
