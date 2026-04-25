import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
    ADMIN_MINT,
    COURT_GENERAL,
    JUROR_MINT,
    JUROR_STAKE,
    ONE_ETHER,
    VOTER_MINT,
} from "./constants";

/**
 * End-to-end fixture: deploys every contract and wires them together exactly
 * the way a production deploy would. Returns all signers and contract handles
 * so individual scenarios can focus on the flow under test.
 *
 * Notes on role wiring:
 *   - After `setKlerosCore`, DisputeKit and EscrowBridge keep the KLEROS_CORE_ROLE
 *     granted to the admin during init (neither `setKlerosCore` revokes the old
 *     holder). SortitionModule DOES revoke the previous holder, so we re-grant
 *     KLEROS_CORE_ROLE to the admin on SortitionModule for tests that need to
 *     call `penalize` / `reward` directly without going through KlerosCore.
 *   - The OZ TimelockController is configured with the governor as the only
 *     proposer and `address(0)` (anyone) as the executor.
 */
export async function deployFullProtocol() {
    const signers = await ethers.getSigners();
    const [
        deployer,
        admin,
        arbitrator,
        claimant,
        respondent,
        juror1,
        juror2,
        juror3,
        juror4,
        juror5,
        guardian,
        outsider,
        daoTreasury,
        operationsWallet,
        voterA,
        voterB,
    ] = signers;
    const jurors = [juror1, juror2, juror3, juror4, juror5];
    const jurorByAddress: Record<string, SignerWithAddress> = Object.fromEntries(
        jurors.map((j) => [j.address.toLowerCase(), j])
    );

    // 1. TRNToken
    const TRN = await ethers.getContractFactory("TRNToken");
    const trn = await upgrades.deployProxy(TRN, [admin.address], { kind: "uups" });
    await trn.waitForDeployment();

    // 2. SortitionModule (admin, trn, klerosCore=admin placeholder)
    const Sort = await ethers.getContractFactory("SortitionModule");
    const sortition = await upgrades.deployProxy(
        Sort,
        [admin.address, await trn.getAddress(), admin.address],
        { kind: "uups" }
    );
    await sortition.waitForDeployment();

    // 3. DisputeKit (admin, klerosCore=admin placeholder)
    const DK = await ethers.getContractFactory("DisputeKit");
    const disputeKit = await upgrades.deployProxy(
        DK,
        [admin.address, admin.address],
        { kind: "uups" }
    );
    await disputeKit.waitForDeployment();

    // 4. MockAxelarGateway
    const Gw = await ethers.getContractFactory("MockAxelarGateway");
    const gateway = await Gw.deploy();
    await gateway.waitForDeployment();

    // 5. EscrowBridge (admin, gateway, klerosCore=admin placeholder, chain, dest)
    const EB = await ethers.getContractFactory("EscrowBridge");
    const escrow = await upgrades.deployProxy(
        EB,
        [
            admin.address,
            await gateway.getAddress(),
            admin.address,
            "xrpl",
            "rXRPLTestDestination",
        ],
        { kind: "uups" }
    );
    await escrow.waitForDeployment();

    // 6. KlerosCore
    const KC = await ethers.getContractFactory("KlerosCore");
    const core = await upgrades.deployProxy(
        KC,
        [
            admin.address,
            await disputeKit.getAddress(),
            await sortition.getAddress(),
            await escrow.getAddress(),
            daoTreasury.address,
            operationsWallet.address,
        ],
        { kind: "uups" }
    );
    await core.waitForDeployment();

    // 7. MockArbitrable — required because KlerosCore.executeRuling calls
    //    IArbitrable(d.arbitrable).rule(...). An EOA can't satisfy that.
    const Arb = await ethers.getContractFactory("MockArbitrable");
    const mockArbitrable = await Arb.deploy(await core.getAddress());
    await mockArbitrable.waitForDeployment();

    // 8. Governance (OZ TimelockController + TrianumGovernor)
    const Timelock = await ethers.getContractFactory("TimelockController");
    const timelock = await Timelock.deploy(
        2, // minDelay (seconds) — small for test speed
        [],
        [ethers.ZeroAddress],
        admin.address
    );
    await timelock.waitForDeployment();

    const Governor = await ethers.getContractFactory("TrianumGovernor");
    const governor = await upgrades.deployProxy(
        Governor,
        [
            await trn.getAddress(),
            await timelock.getAddress(),
            admin.address,
            1,
            10,
            10_000n * ONE_ETHER,
            4,
        ],
        { kind: "uups" }
    );
    await governor.waitForDeployment();

    const PROPOSER_ROLE = await (timelock as any).PROPOSER_ROLE();
    const CANCELLER_ROLE = await (timelock as any).CANCELLER_ROLE();
    await (timelock as any)
        .connect(admin)
        .grantRole(PROPOSER_ROLE, await governor.getAddress());
    await (timelock as any)
        .connect(admin)
        .grantRole(CANCELLER_ROLE, await governor.getAddress());

    // Cross-wire KlerosCore onto modules
    await (disputeKit as any).connect(admin).setKlerosCore(await core.getAddress());
    await (sortition as any).connect(admin).setKlerosCore(await core.getAddress());
    await (escrow as any).connect(admin).setKlerosCore(await core.getAddress());
    await (trn as any).connect(admin).setSortitionModule(await sortition.getAddress());

    // Re-grant admin KLEROS_CORE_ROLE on SortitionModule so integration tests
    // can exercise penalize/reward directly (KlerosCore currently does not
    // trigger those internally — flagged as a TODO in the source).
    const KC_ROLE = await (sortition as any).KLEROS_CORE_ROLE();
    await (sortition as any).connect(admin).grantRole(KC_ROLE, admin.address);

    // Mint TRN — jurors, parties, voters, admin
    const recipients = [
        ...jurors.map((j) => j.address),
        claimant.address,
        respondent.address,
        voterA.address,
        voterB.address,
        admin.address,
    ];
    const amounts = [
        ...jurors.map(() => JUROR_MINT),
        10_000n * ONE_ETHER,
        10_000n * ONE_ETHER,
        VOTER_MINT,
        VOTER_MINT,
        ADMIN_MINT,
    ];
    await (trn as any).connect(admin).initialDistribution(recipients, amounts);

    // Stake each juror in the General court (enough headroom for a 3-juror draw)
    for (const j of jurors) {
        await (trn as any).connect(j).approve(await sortition.getAddress(), ethers.MaxUint256);
        await (sortition as any).connect(j).stake(COURT_GENERAL, JUROR_STAKE);
    }

    // Self-delegation activates ERC20Votes voting weight
    for (const v of [voterA, voterB]) {
        await (trn as any).connect(v).delegate(v.address);
    }

    return {
        // signers
        deployer, admin, arbitrator, claimant, respondent,
        juror1, juror2, juror3, juror4, juror5, jurors, jurorByAddress,
        guardian, outsider, daoTreasury, operationsWallet, voterA, voterB,
        // contracts
        trn, sortition, disputeKit, escrow, core, gateway,
        mockArbitrable, timelock, governor,
    };
}

export type FullProtocol = Awaited<ReturnType<typeof deployFullProtocol>>;

/**
 * Build the `extraData` blob that KlerosCore.createDispute expects.
 */
export function encodeDisputeExtraData(
    courtType: number,
    escrowID: string,
    claimant: string,
    respondent: string,
    disputeAmount: bigint
): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint8", "bytes32", "address", "address", "uint256"],
        [courtType, escrowID, claimant, respondent, disputeAmount]
    );
}

/**
 * Hash format used by DisputeKit.revealVote.
 */
export function commitHash(choice: number, salt: bigint): string {
    return ethers.solidityPackedKeccak256(["uint256", "uint256"], [choice, salt]);
}
