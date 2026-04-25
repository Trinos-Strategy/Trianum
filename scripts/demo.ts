/**
 * Trianum Protocol — Live Dispute Lifecycle Demo
 *
 * Runs on the local Hardhat network (no testnet, no env vars required).
 * Walks through every stage a real dispute would go through on XRPL EVM Sidechain:
 *
 *   1. Contract deployment (8 production contracts + governance + mocks)
 *   2. TRN distribution & juror staking
 *   3. Cross-chain escrow registration (via MockAxelarGateway)
 *   4. Dispute creation (IArbitrable flow via MockArbitrable)
 *   5. Arbitrator assignment + evidence phase
 *   6. Dual Award drafting (A/B paths)
 *   7. Jury sortition + Commit-Reveal voting
 *   8. Tally
 *   9. Slashing + reward distribution
 *  10. Award signing
 *  11. Appeal window + executeRuling()
 *  12. Final on-chain state (MockArbitrable.rulings, EscrowBridge status)
 *
 * Run with:  npm run demo
 *      or:   npx hardhat run scripts/demo.ts
 *
 * VIDEO MODE — for screen-recording this demo as proof of working code:
 *   VIDEO_MODE=1 npm run demo
 *
 *   Adds calibrated pauses between phases and key beats, stretching total
 *   runtime to ~80-90 seconds so a viewer can read each step. Default mode
 *   (no env var) remains fast (~1 second) for CI and quick verification.
 */

import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

// ──────────────────────────────────────────────────────────────────────
// Constants (must match test/helpers/constants.ts and KlerosCore.sol)
// ──────────────────────────────────────────────────────────────────────
const ONE_ETHER = 10n ** 18n;
const JUROR_MINT = 50_000n * ONE_ETHER;
const JUROR_STAKE = 10_000n * ONE_ETHER;
const ADMIN_MINT = 100_000_000n * ONE_ETHER;
const COURT_GENERAL = 0;
const COMMIT_PERIOD_SEC = 48 * 60 * 60;
const REVEAL_PERIOD_SEC = 24 * 60 * 60;
const APPEAL_PERIOD_SEC = 7 * 24 * 60 * 60;

// Enum mirrors
const Vote = { Refused: 0, AwardA: 1, AwardB: 2 } as const;
const DisputeStatus = {
    None: 0, Created: 1, Evidence: 2, DualAward: 3, Commit: 4,
    Reveal: 5, Resolved: 6, Appealable: 7, Appealed: 8, Executed: 9,
} as const;
const EscrowStatus = {
    None: 0, Registered: 1, ReleaseRequested: 2, Released: 3,
    RefundRequested: 4, Refunded: 5, Failed: 6,
} as const;

// ──────────────────────────────────────────────────────────────────────
// Pretty-printing helpers
// ──────────────────────────────────────────────────────────────────────
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const magenta = (s: string) => `\x1b[35m${s}\x1b[0m`;

const BAR = "═".repeat(68);
const HR = "─".repeat(68);

function header(title: string) {
    console.log("\n" + cyan(BAR));
    console.log(cyan("  " + bold(title)));
    console.log(cyan(BAR));
}

function phase(n: number, title: string) {
    console.log("\n" + magenta(`▎ PHASE ${n}`) + "  " + bold(title));
    console.log(dim(HR));
}

function step(msg: string) {
    console.log("  " + msg);
}

function ok(msg: string) {
    console.log("  " + green("✓") + " " + msg);
}

function info(msg: string) {
    console.log("  " + dim("·") + " " + dim(msg));
}

function shortAddr(addr: string): string {
    return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function trn(amount: bigint): string {
    const whole = amount / ONE_ETHER;
    return whole.toLocaleString("en-US") + " TRN";
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

// ──────────────────────────────────────────────────────────────────────
// Video-mode pacing — adds calibrated pauses when VIDEO_MODE=1
// ──────────────────────────────────────────────────────────────────────
const VIDEO_MODE = process.env.VIDEO_MODE === "1";
const pace = (ms: number = 500): Promise<void> =>
    VIDEO_MODE ? sleep(ms) : Promise.resolve();
// Pause durations:
//   pace(1800) — section boundary (intro / closing)
//   pace(1100) — phase boundary
//   pace(600)  — between substantial steps within a phase
//   pace(300)  — quick beat (numeric stat reveal etc.)

// ──────────────────────────────────────────────────────────────────────
// Commit hash helper (matches DisputeKit.sol)
// ──────────────────────────────────────────────────────────────────────
function commitHash(vote: number, salt: bigint): string {
    return ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["uint8", "uint256"], [vote, salt])
    );
}

function encodeDisputeExtraData(
    courtId: number,
    escrowID: string,
    claimant: string,
    respondent: string,
    amount: bigint
): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint96", "bytes32", "address", "address", "uint256"],
        [courtId, escrowID, claimant, respondent, amount]
    );
}

// ──────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────
async function main() {
    const t0 = Date.now();

    header("Trianum Protocol — Live Dispute Lifecycle Demo");
    console.log(dim("  XRPL-native decentralized dispute resolution"));
    console.log(dim("  Three-fold structure · Dual Award · 3–5 weeks · 3% fee"));
    console.log(dim("  Running on local Hardhat network (no testnet required)"));
    await pace(1800);

    // ────────────────────────────────────────────────────────────────
    // PHASE 1 — Deployment
    // ────────────────────────────────────────────────────────────────
    phase(1, "Deployment");
    await pace(900);

    const signers = await ethers.getSigners();
    const [
        deployer, admin, arbitrator, claimant, respondent,
        juror1, juror2, juror3, juror4, juror5,
        /* guardian */ , outsider, daoTreasury, operationsWallet,
    ] = signers;
    const jurors = [juror1, juror2, juror3, juror4, juror5];
    const jurorByAddress: Record<string, (typeof jurors)[number]> = Object.fromEntries(
        jurors.map((j) => [j.address.toLowerCase(), j])
    );

    // 1. TRNToken (brand: TRN)
    const TRN = await ethers.getContractFactory("TRNToken");
    const trnToken = await upgrades.deployProxy(TRN, [admin.address], { kind: "uups" });
    await trnToken.waitForDeployment();
    ok(`TRN Token         ${shortAddr(await trnToken.getAddress())}  ${dim("(contract: TRNToken.sol)")}`);

    // 2. SortitionModule
    const Sort = await ethers.getContractFactory("SortitionModule");
    const sortition = await upgrades.deployProxy(
        Sort,
        [admin.address, await trnToken.getAddress(), admin.address],
        { kind: "uups" }
    );
    await sortition.waitForDeployment();
    ok(`SortitionModule   ${shortAddr(await sortition.getAddress())}`);

    // 3. DisputeKit
    const DK = await ethers.getContractFactory("DisputeKit");
    const disputeKit = await upgrades.deployProxy(
        DK, [admin.address, admin.address], { kind: "uups" }
    );
    await disputeKit.waitForDeployment();
    ok(`DisputeKit        ${shortAddr(await disputeKit.getAddress())}`);

    // 4. MockAxelarGateway (stands in for the real XRPL EVM Axelar gateway)
    const Gw = await ethers.getContractFactory("MockAxelarGateway");
    const gateway = await Gw.deploy();
    await gateway.waitForDeployment();
    ok(`MockAxelarGateway ${shortAddr(await gateway.getAddress())}  ${dim("(prod: Axelar GMP Gateway)")}`);

    // 5. EscrowBridge
    const EB = await ethers.getContractFactory("EscrowBridge");
    const escrow = await upgrades.deployProxy(
        EB,
        [admin.address, await gateway.getAddress(), admin.address, "xrpl", "rXRPLTestDestination"],
        { kind: "uups" }
    );
    await escrow.waitForDeployment();
    ok(`EscrowBridge      ${shortAddr(await escrow.getAddress())}`);

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
    ok(`KlerosCore        ${shortAddr(await core.getAddress())}  ${dim("(central dispute state machine)")}`);

    // 7. MockArbitrable (the escrow contract that would invoke Trianum in production)
    const Arb = await ethers.getContractFactory("MockArbitrable");
    const mockArbitrable = await Arb.deploy(await core.getAddress());
    await mockArbitrable.waitForDeployment();
    ok(`MockArbitrable    ${shortAddr(await mockArbitrable.getAddress())}  ${dim("(simulates a third-party escrow)")}`);

    // 8. Governance (TimelockController + TrianumGovernor)
    const Timelock = await ethers.getContractFactory("TimelockController");
    const timelock = await Timelock.deploy(2, [], [ethers.ZeroAddress], admin.address);
    await timelock.waitForDeployment();
    const Governor = await ethers.getContractFactory("TrianumGovernor");
    const governor = await upgrades.deployProxy(
        Governor,
        [
            await trnToken.getAddress(),
            await timelock.getAddress(),
            admin.address,
            1, 10, 10_000n * ONE_ETHER, 4,
        ],
        { kind: "uups" }
    );
    await governor.waitForDeployment();
    ok(`TimelockCtrl      ${shortAddr(await timelock.getAddress())}`);
    ok(`TrianumGovernor    ${shortAddr(await governor.getAddress())}  ${dim("(DAO voting on TRN)")}`);

    // Cross-wiring
    await (disputeKit as any).connect(admin).setKlerosCore(await core.getAddress());
    await (sortition as any).connect(admin).setKlerosCore(await core.getAddress());
    await (escrow as any).connect(admin).setKlerosCore(await core.getAddress());
    await (trnToken as any).connect(admin).setSortitionModule(await sortition.getAddress());
    const PROPOSER_ROLE = await (timelock as any).PROPOSER_ROLE();
    await (timelock as any).connect(admin).grantRole(PROPOSER_ROLE, await governor.getAddress());
    const KC_ROLE = await (sortition as any).KLEROS_CORE_ROLE();
    await (sortition as any).connect(admin).grantRole(KC_ROLE, admin.address);
    info("Cross-wired KlerosCore into all modules; granted roles");
    await pace(1100);

    // ────────────────────────────────────────────────────────────────
    // PHASE 2 — Setup: TRN distribution + juror staking
    // ────────────────────────────────────────────────────────────────
    phase(2, "TRN Distribution & Juror Staking");
    await pace(900);

    const recipients = [
        ...jurors.map((j) => j.address),
        claimant.address, respondent.address, admin.address,
    ];
    const amounts = [
        ...jurors.map(() => JUROR_MINT),
        10_000n * ONE_ETHER, 10_000n * ONE_ETHER, ADMIN_MINT,
    ];
    await (trnToken as any).connect(admin).initialDistribution(recipients, amounts);

    step(bold("Distributing TRN tokens:"));
    for (let i = 0; i < jurors.length; i++) {
        info(`Juror ${i + 1} (${shortAddr(jurors[i].address)}) → ${trn(JUROR_MINT)}`);
    }
    info(`Claimant  (${shortAddr(claimant.address)}) → ${trn(10_000n * ONE_ETHER)}`);
    info(`Respondent (${shortAddr(respondent.address)}) → ${trn(10_000n * ONE_ETHER)}`);
    await pace(900);

    step("");
    step(bold("Staking jurors in the General Court (min 10,000 TRN each):"));
    await pace(400);
    for (let i = 0; i < jurors.length; i++) {
        await (trnToken as any).connect(jurors[i])
            .approve(await sortition.getAddress(), ethers.MaxUint256);
        await (sortition as any).connect(jurors[i]).stake(COURT_GENERAL, JUROR_STAKE);
        ok(`Juror ${i + 1} staked ${trn(JUROR_STAKE)}`);
    }

    await pace(1100);

    // ────────────────────────────────────────────────────────────────
    // PHASE 3 — Dispute creation
    // ────────────────────────────────────────────────────────────────
    phase(3, "Dispute Creation");
    await pace(900);

    const disputeID = 0;
    const amount = 1_000n * ONE_ETHER;
    const escrowID = ethers.keccak256(ethers.toUtf8Bytes("escrow-demo-001"));

    step(bold("Scenario"));
    info("Cross-border XRPL escrow dispute");
    info(`Claimant:   ${shortAddr(claimant.address)}`);
    info(`Respondent: ${shortAddr(respondent.address)}`);
    info(`Escrow:     1,000 XRP (represented as ${trn(amount)} in local demo — test token reused for amount primitives)`);
    info(`Court:      General (ID ${COURT_GENERAL})`);
    info(`Fee:        30 TRN (3% of dispute amount)`);
    await pace(900);

    await (escrow as any).connect(admin).registerEscrow(
        escrowID, disputeID, amount, claimant.address, respondent.address
    );
    ok("Cross-chain escrow registered on EscrowBridge");

    const extraData = encodeDisputeExtraData(
        COURT_GENERAL, escrowID, claimant.address, respondent.address, amount
    );
    const requiredFee = (amount * 300n) / 10_000n;
    const minFee = 10n * ONE_ETHER;
    const fee = requiredFee > minFee ? requiredFee : minFee;
    await (mockArbitrable as any).connect(claimant).createDispute(extraData, { value: fee });
    ok("Dispute created via IArbitrable → KlerosCore");

    let d = await (core as any).getDispute(disputeID);
    info(`Status: Created (${d.status})`);
    await pace(1100);

    // ────────────────────────────────────────────────────────────────
    // PHASE 4 — Arbitration: assignment + evidence
    // ────────────────────────────────────────────────────────────────
    phase(4, "Arbitrator Assignment & Evidence");
    await pace(900);

    await (core as any).connect(admin).assignArbitrator(disputeID, arbitrator.address);
    ok(`Arbitrator assigned: ${shortAddr(arbitrator.address)}`);
    await (disputeKit as any).connect(admin).setDisputeArbitrator(disputeID, arbitrator.address);

    await (core as any).connect(claimant).submitEvidence(disputeID, "ipfs://evidence-claimant-A");
    await (core as any).connect(respondent).submitEvidence(disputeID, "ipfs://evidence-respondent-B");
    ok("Claimant submitted evidence   → ipfs://evidence-claimant-A");
    ok("Respondent submitted evidence → ipfs://evidence-respondent-B");

    await (core as any).connect(arbitrator).closeEvidencePeriod(disputeID);
    d = await (core as any).getDispute(disputeID);
    ok(`Evidence period closed  Status: DualAward (${d.status})`);
    await pace(1100);

    // ────────────────────────────────────────────────────────────────
    // PHASE 5 — Dual Award drafting
    // ────────────────────────────────────────────────────────────────
    phase(5, "Dual Award Drafting");
    await pace(900);

    step(bold("Arbitrator drafts two complete awards:"));
    info('Award A: "Plaintiff prevails — delivery verified by on-chain timestamps and off-chain receipts"');
    info('Award B: "Defendant prevails — alleged contract breach on claimant side (failed milestone 2)"');
    await pace(1100);

    const awardA = ethers.keccak256(ethers.toUtf8Bytes("award-A-plaintiff-wins"));
    const awardB = ethers.keccak256(ethers.toUtf8Bytes("award-B-defendant-wins"));
    const caseRoot = ethers.keccak256(ethers.toUtf8Bytes("case-package-merkle-root"));
    await (disputeKit as any).connect(arbitrator).commitDualAward(disputeID, awardA, awardB, caseRoot);
    ok(`Award A hash committed: ${awardA.slice(0, 18)}…`);
    ok(`Award B hash committed: ${awardB.slice(0, 18)}…`);
    ok(`Case package root:      ${caseRoot.slice(0, 18)}…`);
    await pace(1100);

    // ────────────────────────────────────────────────────────────────
    // PHASE 6 — Sortition: draw jury
    // ────────────────────────────────────────────────────────────────
    phase(6, "Jury Sortition (Stake-Weighted Random Draw)");
    await pace(900);

    await (core as any).connect(admin).startVotingRound(disputeID);
    d = await (core as any).getDispute(disputeID);
    const round = await (disputeKit as any).getRound(disputeID, 0);
    const drawn: string[] = round.jurors;
    step(bold(`Drew ${drawn.length} jurors for the voting panel:`));
    for (const addr of drawn) {
        const idx = jurors.findIndex((j) => j.address.toLowerCase() === addr.toLowerCase());
        info(`→ Juror ${idx + 1}  (${shortAddr(addr)})`);
    }
    info(`Status: Commit (${d.status})`);
    await pace(1100);

    // ────────────────────────────────────────────────────────────────
    // PHASE 7 — Commit phase
    // ────────────────────────────────────────────────────────────────
    phase(7, "Commit Phase (Jurors Vote Privately)");
    await pace(900);

    const drawnSigners = drawn.map((a) => jurorByAddress[a.toLowerCase()]);
    const salts = [111n, 222n, 333n];
    // Two vote AwardA, one votes AwardB — majority = AwardA
    const choices = [Vote.AwardA, Vote.AwardA, Vote.AwardB];
    const choiceLabel = (c: number) => (c === Vote.AwardA ? "AwardA" : c === Vote.AwardB ? "AwardB" : "Refused");

    for (let i = 0; i < 3; i++) {
        const ch = commitHash(choices[i], salts[i]);
        await (disputeKit as any).connect(drawnSigners[i]).commitVote(disputeID, ch);
        const idx = jurors.findIndex((j) => j.address === drawnSigners[i].address) + 1;
        ok(`Juror ${idx} committed ${ch.slice(0, 12)}…  ${dim(`(secret vote: ${choiceLabel(choices[i])})`)}`);
        await pace(450);
    }

    await time.increase(COMMIT_PERIOD_SEC + 1);
    info(yellow(`⏳ Commit period elapsed (48h simulated)`));
    await (core as any).advanceToReveal(disputeID);
    d = await (core as any).getDispute(disputeID);
    info(`Status: Reveal (${d.status})`);
    await pace(1100);

    // ────────────────────────────────────────────────────────────────
    // PHASE 8 — Reveal phase
    // ────────────────────────────────────────────────────────────────
    phase(8, "Reveal Phase (Jurors Open Their Votes)");
    await pace(900);

    for (let i = 0; i < 3; i++) {
        await (disputeKit as any).connect(drawnSigners[i])
            .revealVote(disputeID, choices[i], salts[i]);
        const idx = jurors.findIndex((j) => j.address === drawnSigners[i].address) + 1;
        ok(`Juror ${idx} revealed: ${bold(choiceLabel(choices[i]))}  ${green("(commit matched)")}`);
        await pace(450);
    }

    await time.increase(REVEAL_PERIOD_SEC + 1);
    info(yellow(`⏳ Reveal period elapsed (24h simulated)`));
    await pace(1100);

    // ────────────────────────────────────────────────────────────────
    // PHASE 9 — Tally
    // ────────────────────────────────────────────────────────────────
    phase(9, "Tally");
    await pace(900);

    await (core as any).triggerTally(disputeID);
    d = await (core as any).getDispute(disputeID);
    const rulingLabel = d.ruling === 1n ? "AwardA (Plaintiff wins)" :
                        d.ruling === 2n ? "AwardB (Defendant wins)" : "Refused";
    step(`AwardA: 2 votes  ${green("← MAJORITY")}`);
    await pace(500);
    step(`AwardB: 1 vote`);
    await pace(700);
    console.log();
    ok(`${bold("Ruling: " + rulingLabel)}`);
    info(`Status: Resolved (${d.status})`);
    await pace(1100);

    // ────────────────────────────────────────────────────────────────
    // PHASE 10 — Slashing & rewards
    // ────────────────────────────────────────────────────────────────
    phase(10, "Slashing & Reward Distribution");
    await pace(900);

    const minorityIdx = choices.findIndex((c) => c === Vote.AwardB);
    const minority = drawnSigners[minorityIdx];
    const majority = drawnSigners.filter((_, i) => i !== minorityIdx);
    const minorityJurorNum = jurors.findIndex((j) => j.address === minority.address) + 1;

    const stakeBefore = await (sortition as any).getStake(minority.address, COURT_GENERAL);
    step(`Minority juror (Juror ${minorityJurorNum}) stake before: ${trn(stakeBefore)}`);
    await pace(700);
    await (sortition as any).connect(admin).penalize(minority.address, disputeID);
    const stakeAfter = await (sortition as any).getStake(minority.address, COURT_GENERAL);
    ok(red(`10% slashed — stake after: ${trn(stakeAfter)}  (-${trn(stakeBefore - stakeAfter)})`));
    await pace(900);

    const rewardAmount = 100n * ONE_ETHER;
    await (trnToken as any).connect(admin)
        .transfer(await sortition.getAddress(), rewardAmount * 2n);
    console.log();
    step(bold(`Rewarding majority jurors (${majority.length}):`));
    await pace(400);
    for (const m of majority) {
        await (sortition as any).connect(admin).reward(m.address, disputeID, rewardAmount);
        const idx = jurors.findIndex((j) => j.address === m.address) + 1;
        ok(green(`Juror ${idx} rewarded: +${trn(rewardAmount)}`));
        await pace(450);
    }
    await pace(700);

    // ────────────────────────────────────────────────────────────────
    // PHASE 11 — Sign & execute
    // ────────────────────────────────────────────────────────────────
    phase(11, "Award Signing & Execution");
    await pace(900);

    await (core as any).connect(arbitrator).signAward(disputeID, "0x");
    d = await (core as any).getDispute(disputeID);
    ok(`Arbitrator signed the award  Status: Appealable (${d.status})`);
    await pace(700);

    await time.increase(APPEAL_PERIOD_SEC + 1);
    info(yellow(`⏳ Appeal period elapsed (7 days simulated) — no appeal filed`));
    await pace(800);

    await (core as any).connect(outsider).executeRuling(disputeID);
    d = await (core as any).getDispute(disputeID);
    ok(`executeRuling() called  Status: Executed (${d.status})`);
    await pace(1100);

    // ────────────────────────────────────────────────────────────────
    // PHASE 12 — On-chain side effects
    // ────────────────────────────────────────────────────────────────
    phase(12, "On-Chain Side Effects");
    await pace(900);

    const finalRuling = await (mockArbitrable as any).rulings(disputeID);
    const finalEscrowStatus = await (escrow as any).getEscrowStatus(escrowID);
    ok(`MockArbitrable received ruling:  ${finalRuling === 1n ? "AwardA" : finalRuling === 2n ? "AwardB" : "Refused"}`);
    await pace(700);
    ok(`EscrowBridge escrow status:       ${finalEscrowStatus === BigInt(EscrowStatus.ReleaseRequested) ? "ReleaseRequested" : "Other(" + finalEscrowStatus + ")"}`);
    await pace(900);
    console.log();
    info("In production, this state would propagate through Axelar GMP to XRPL");
    info("Mainnet and auto-release the native escrow to the prevailing party.");
    await pace(1500);

    // ────────────────────────────────────────────────────────────────
    // Footer
    // ────────────────────────────────────────────────────────────────
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log("\n" + cyan(BAR));
    console.log("  " + green(bold("✅  Dispute lifecycle complete")));
    console.log();
    console.log(`  Real-world duration (simulated):  ${bold("~3.5 weeks")}`);
    console.log(`  Local execution time:             ${bold(elapsed + "s")}`);
    console.log();
    console.log(`  Next steps:`);
    console.log(`    ${dim("• ")}${cyan("npx hardhat test")}          ${dim("run 114 tests covering every scenario")}`);
    console.log(`    ${dim("• ")}${cyan("npx hardhat coverage")}      ${dim("generate coverage report")}`);
    console.log(`    ${dim("• ")}Read ${cyan("contracts/core/KlerosCore.sol")}`);
    console.log(`    ${dim("• ")}Visit ${cyan("https://trianum.trinos.group")}`);
    console.log(cyan(BAR) + "\n");
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("\n" + red("✗ Demo failed"));
        console.error(err);
        process.exit(1);
    });
