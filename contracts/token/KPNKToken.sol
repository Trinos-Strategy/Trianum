// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IKPNKToken.sol";

/**
 * @title KPNKToken
 * @notice K-PNK Work Token (ERC-20 + ERC20Votes + ERC20Permit)
 * @dev Total supply: 1,000,000,000 (1B). No revenue distribution.
 *      Uses: staking, governance, court creation.
 */
contract KPNKToken is
    ERC20Upgradeable,
    ERC20VotesUpgradeable,
    ERC20PermitUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IKPNKToken
{
    bytes32 public constant TRANSFER_CONTROLLER_ROLE = keccak256("TRANSFER_CONTROLLER_ROLE");

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000e18;

    mapping(address => bool) private _transferRestricted;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _admin) external initializer {
        __ERC20_init("K-PNK", "K-PNK");
        __ERC20Permit_init("K-PNK");
        __ERC20Votes_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(TRANSFER_CONTROLLER_ROLE, _admin);
        _mint(_admin, TOTAL_SUPPLY);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function setTransferRestriction(address _account, bool _restricted) external override onlyRole(TRANSFER_CONTROLLER_ROLE) {
        _transferRestricted[_account] = _restricted;
        emit TransferRestrictionChanged(_account, _restricted);
    }

    function isTransferRestricted(address _account) external view override returns (bool) {
        return _transferRestricted[_account];
    }

    function initialDistribution(address[] calldata _recipients, uint256[] calldata _amounts) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        // TODO: iterate and transfer from admin
        revert("Not implemented");
    }

    // ── Overrides required by multiple inheritance ──
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20VotesUpgradeable)
    {
        if (from != address(0)) {
            require(!_transferRestricted[from], "KPNK: transfer restricted");
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
