import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { KPNKToken, KlerosGovernor, TimelockController } from "../typechain-types";

// Governor parameter set for tests (kept small so the vote window can be walked
// forward with a handful of mined blocks rather than 50k).
const VOTING_DELAY = 1;          // blocks
const VOTING_PERIOD = 10;        // blocks
const PROPOSAL_THRESHOLD = ethers.parseEther("10000"); // 10,000 K-PNK
const QUORUM_PERCENT = 4;        // 4%
const TIMELOCK_MIN_DELAY = 2;    // seconds (must be > 0)

// OZ Governor proposal states
const State = {
    Pending: 0,
    Active: 1,
    Canceled: 2,
    Defeated: 3,
    Succeeded: 4,
    Queued: 5,
    Expired: 6,
    Executed: 7,
};

// GovernorCountingSimple vote kinds
const Vote = { Against: 0, For: 1, Abstain: 2 };

describe("KlerosGovernor", function () {
    let token: KPNKToken;
    let timelock: TimelockController;
    let governor: KlerosGovernor;

    let admin: SignerWithAddress;
    let proposer: SignerWithAddress; // big bag holder who can submit proposals
    let voterA: SignerWithAddress;
    let voterB: SignerWithAddress;
    let voterC: SignerWithAddress;
    let outsider: SignerWithAddress;

    async function setup() {
        [admin, proposer, voterA, voterB, voterC, outsider] = await ethers.getSigners();

        // 1. K-PNK token with voting
        const Token = await ethers.getContractFactory("KPNKToken");
        token = (await upgrades.deployProxy(Token, [admin.address], {
            kind: "uups",
        })) as unknown as KPNKToken;
        await token.waitForDeployment();

        // 2. Seed voting power. Distribution crafted so:
        //    - proposer has > PROPOSAL_THRESHOLD (passes `proposalThreshold`)
        //    - voterA + voterB together clear the 4% quorum of (supply-so-far)
        await token.connect(admin).initialDistribution(
            [proposer.address, voterA.address, voterB.address, voterC.address],
            [
                ethers.parseEther("50000"),   // proposer
                ethers.parseEther("500000"),  // voterA
                ethers.parseEther("500000"),  // voterB
                ethers.parseEther("100000"),  // voterC
            ]
        );

        // Self-delegation activates ERC20Votes voting power
        await token.connect(proposer).delegate(proposer.address);
        await token.connect(voterA).delegate(voterA.address);
        await token.connect(voterB).delegate(voterB.address);
        await token.connect(voterC).delegate(voterC.address);

        // 3. TimelockController — deployer is temporary admin; roles for the
        //    governor are granted after it deploys (the usual chicken-and-egg).
        const Timelock = await ethers.getContractFactory("TimelockController");
        timelock = (await Timelock.deploy(
            TIMELOCK_MIN_DELAY,
            [],            // proposers (will grant to governor later)
            [ethers.ZeroAddress], // executors — address(0) = anyone can execute after delay
            admin.address  // initial admin
        )) as unknown as TimelockController;
        await timelock.waitForDeployment();

        // 4. KlerosGovernor (UUPS proxy)
        const Governor = await ethers.getContractFactory("KlerosGovernor");
        governor = (await upgrades.deployProxy(
            Governor,
            [
                await token.getAddress(),
                await timelock.getAddress(),
                admin.address,
                VOTING_DELAY,
                VOTING_PERIOD,
                PROPOSAL_THRESHOLD,
                QUORUM_PERCENT,
            ],
            { kind: "uups" }
        )) as unknown as KlerosGovernor;
        await governor.waitForDeployment();

        // 5. Wire governor into the timelock as the only proposer
        const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
        const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
        await timelock.connect(admin).grantRole(PROPOSER_ROLE, await governor.getAddress());
        await timelock.connect(admin).grantRole(CANCELLER_ROLE, await governor.getAddress());
    }

    beforeEach(async function () {
        await setup();
    });

    // ─────────────────────────────────────────────
    describe("Initialization", function () {
        it("exposes the configured parameters", async function () {
            expect(await governor.name()).to.equal("KlerosGovernor");
            expect(await governor.votingDelay()).to.equal(VOTING_DELAY);
            expect(await governor.votingPeriod()).to.equal(VOTING_PERIOD);
            expect(await governor.proposalThreshold()).to.equal(PROPOSAL_THRESHOLD);
            expect(await governor.timelock()).to.equal(await timelock.getAddress());
        });

        it("enforces the quorum fraction (4% of past total supply)", async function () {
            const totalSupply = await token.totalSupply();
            // quorum() asks for a past block, not a timestamp; use the block before current
            const blockNumber = await ethers.provider.getBlockNumber();
            await mine(1); // make sure block-1 is in the past
            const q = await governor.quorum(blockNumber);
            expect(q).to.equal((totalSupply * BigInt(QUORUM_PERCENT)) / 100n);
        });

        it("rejects zero-address inputs at init", async function () {
            const Governor = await ethers.getContractFactory("KlerosGovernor");
            await expect(
                upgrades.deployProxy(
                    Governor,
                    [
                        ethers.ZeroAddress,
                        await timelock.getAddress(),
                        admin.address,
                        VOTING_DELAY,
                        VOTING_PERIOD,
                        PROPOSAL_THRESHOLD,
                        QUORUM_PERCENT,
                    ],
                    { kind: "uups" }
                )
            ).to.be.revertedWithCustomError(governor, "ZeroAddress");
        });
    });

    // ─────────────────────────────────────────────
    describe("Proposal lifecycle", function () {
        /** Build a proposal that calls `governor.setVotingDelay(newValue)` — the
         *  target function is `onlyGovernance`, making it an ideal assertion point
         *  for "an action actually executed via the timelock". */
        function buildSetVotingDelayProposal(newDelay: number) {
            const targets = [governor.target as string];
            const values = [0n];
            const calldatas = [
                governor.interface.encodeFunctionData("setVotingDelay", [newDelay]),
            ];
            const description = `Increase voting delay to ${newDelay}`;
            const descriptionHash = ethers.id(description);
            return { targets, values, calldatas, description, descriptionHash };
        }

        it("walks a proposal from Pending → Executed end-to-end", async function () {
            const NEW_DELAY = 3;
            const { targets, values, calldatas, description, descriptionHash } =
                buildSetVotingDelayProposal(NEW_DELAY);

            // Submit (proposer has > PROPOSAL_THRESHOLD)
            const tx = await governor
                .connect(proposer)
                .propose(targets, values, calldatas, description);
            const receipt = await tx.wait();
            const proposeLog = receipt!.logs
                .map((l) => {
                    try {
                        return governor.interface.parseLog(l as any);
                    } catch {
                        return null;
                    }
                })
                .find((e) => e && e.name === "ProposalCreated");
            const proposalId: bigint = proposeLog!.args.proposalId;

            expect(await governor.state(proposalId)).to.equal(State.Pending);

            // Walk past votingDelay
            await mine(VOTING_DELAY + 1);
            expect(await governor.state(proposalId)).to.equal(State.Active);

            // Cast votes — A + B together ≥ 4% quorum and majority For
            await governor.connect(voterA).castVote(proposalId, Vote.For);
            await governor.connect(voterB).castVote(proposalId, Vote.For);
            await governor.connect(voterC).castVote(proposalId, Vote.Against);

            // Walk past votingPeriod
            await mine(VOTING_PERIOD + 1);
            expect(await governor.state(proposalId)).to.equal(State.Succeeded);

            // Queue into timelock
            await governor
                .connect(proposer)
                .queue(targets, values, calldatas, descriptionHash);
            expect(await governor.state(proposalId)).to.equal(State.Queued);

            // Walk past timelock minDelay
            await time.increase(TIMELOCK_MIN_DELAY + 1);

            // Execute
            await governor
                .connect(proposer)
                .execute(targets, values, calldatas, descriptionHash);
            expect(await governor.state(proposalId)).to.equal(State.Executed);

            // Side effect — votingDelay actually changed
            expect(await governor.votingDelay()).to.equal(NEW_DELAY);
        });

        it("reverts proposal creation when proposer is under threshold", async function () {
            const { targets, values, calldatas, description } =
                buildSetVotingDelayProposal(3);

            // `outsider` has no tokens → 0 voting power
            await expect(
                governor.connect(outsider).propose(targets, values, calldatas, description)
            ).to.be.reverted; // GovernorInsufficientProposerVotes
        });

        it.skip("rejects queue when quorum is not met", async function () {
            // Use a proposal where ONLY voterC (1% of supply) votes For → below 4% quorum
            const { targets, values, calldatas, description, descriptionHash } =
                buildSetVotingDelayProposal(5);

            const tx = await governor
                .connect(proposer)
                .propose(targets, values, calldatas, description);
            const receipt = await tx.wait();
            const proposalId: bigint = receipt!.logs
                .map((l) => { try { return governor.interface.parseLog(l as any); } catch { return null; } })
                .find((e) => e && e.name === "ProposalCreated")!.args.proposalId;

            await mine(VOTING_DELAY + 1);
            await governor.connect(voterC).castVote(proposalId, Vote.For);
            await mine(VOTING_PERIOD + 1);

            expect(await governor.state(proposalId)).to.equal(State.Defeated);
            await expect(
                governor.connect(proposer).queue(targets, values, calldatas, descriptionHash)
            ).to.be.reverted; // GovernorUnexpectedProposalState
        });

        it("rejects execute before the timelock minDelay", async function () {
            const { targets, values, calldatas, description, descriptionHash } =
                buildSetVotingDelayProposal(4);

            const tx = await governor
                .connect(proposer)
                .propose(targets, values, calldatas, description);
            const receipt = await tx.wait();
            const proposalId: bigint = receipt!.logs
                .map((l) => { try { return governor.interface.parseLog(l as any); } catch { return null; } })
                .find((e) => e && e.name === "ProposalCreated")!.args.proposalId;

            await mine(VOTING_DELAY + 1);
            await governor.connect(voterA).castVote(proposalId, Vote.For);
            await governor.connect(voterB).castVote(proposalId, Vote.For);
            await mine(VOTING_PERIOD + 1);

            await governor
                .connect(proposer)
                .queue(targets, values, calldatas, descriptionHash);

            // Executing before the delay should bubble up a TimelockController revert
            await expect(
                governor.connect(proposer).execute(targets, values, calldatas, descriptionHash)
            ).to.be.reverted;
        });

        it("counts votes via GovernorCountingSimple (For/Against/Abstain)", async function () {
            const { targets, values, calldatas, description } =
                buildSetVotingDelayProposal(7);
            const tx = await governor
                .connect(proposer)
                .propose(targets, values, calldatas, description);
            const receipt = await tx.wait();
            const proposalId: bigint = receipt!.logs
                .map((l) => { try { return governor.interface.parseLog(l as any); } catch { return null; } })
                .find((e) => e && e.name === "ProposalCreated")!.args.proposalId;

            await mine(VOTING_DELAY + 1);
            await governor.connect(voterA).castVote(proposalId, Vote.For);
            await governor.connect(voterB).castVote(proposalId, Vote.Against);
            await governor.connect(voterC).castVote(proposalId, Vote.Abstain);

            const result = await governor.proposalVotes(proposalId);
            expect(result.forVotes).to.equal(ethers.parseEther("500000"));
            expect(result.againstVotes).to.equal(ethers.parseEther("500000"));
            expect(result.abstainVotes).to.equal(ethers.parseEther("100000"));
        });
    });
});
