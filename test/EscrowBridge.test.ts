import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { EscrowBridge, MockAxelarGateway } from "../typechain-types";

const ONE = 10n ** 18n;
const XRPL_CHAIN = "xrpl";
const XRPL_DEST = "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59";

// Matches EscrowBridge.EscrowStatus
const Status = {
    None: 0,
    Registered: 1,
    ReleaseRequested: 2,
    Released: 3,
    RefundRequested: 4,
    Refunded: 5,
    Failed: 6,
};

describe("EscrowBridge", function () {
    let bridge: EscrowBridge;
    let gateway: MockAxelarGateway;

    let admin: SignerWithAddress;
    let klerosCore: SignerWithAddress;  // mock
    let guardian: SignerWithAddress;
    let relayer: SignerWithAddress;     // acts as GATEWAY_ROLE for direct registration
    let claimant: SignerWithAddress;
    let respondent: SignerWithAddress;
    let other: SignerWithAddress;

    const ESCROW_ID = ethers.keccak256(ethers.toUtf8Bytes("escrow-1"));
    const DISPUTE_ID = 42n;
    const AMOUNT = ONE * 100n;

    beforeEach(async function () {
        [admin, klerosCore, guardian, relayer, claimant, respondent, other] = await ethers.getSigners();

        const Mock = await ethers.getContractFactory("MockAxelarGateway");
        gateway = (await Mock.deploy()) as unknown as MockAxelarGateway;
        await gateway.waitForDeployment();

        const Bridge = await ethers.getContractFactory("EscrowBridge");
        bridge = (await upgrades.deployProxy(Bridge, [
            admin.address,
            await gateway.getAddress(),
            klerosCore.address,
            XRPL_CHAIN,
            XRPL_DEST,
        ], { kind: "uups" })) as unknown as EscrowBridge;
        await bridge.waitForDeployment();

        // Grant relayer the GATEWAY_ROLE so we can exercise registerEscrow directly
        const GATEWAY_ROLE = await bridge.GATEWAY_ROLE();
        await bridge.connect(admin).grantRole(GATEWAY_ROLE, relayer.address);

        // Grant guardian GUARDIAN_ROLE (admin already has it; add explicit signer for clarity)
        const GUARDIAN_ROLE = await bridge.GUARDIAN_ROLE();
        await bridge.connect(admin).grantRole(GUARDIAN_ROLE, guardian.address);
    });

    // ─────────────────────────────────────────────
    describe("Initialization", function () {
        it("stores gateway + chain config + roles", async function () {
            expect(await bridge.gateway()).to.equal(await gateway.getAddress());
            expect(await bridge.xrplChainName()).to.equal(XRPL_CHAIN);
            expect(await bridge.xrplDestinationContract()).to.equal(XRPL_DEST);

            const KC = await bridge.KLEROS_CORE_ROLE();
            expect(await bridge.hasRole(KC, klerosCore.address)).to.be.true;
        });

        it("rejects zero addresses and empty strings", async function () {
            const Bridge = await ethers.getContractFactory("EscrowBridge");
            await expect(upgrades.deployProxy(Bridge, [
                ethers.ZeroAddress, await gateway.getAddress(), klerosCore.address, XRPL_CHAIN, XRPL_DEST
            ], { kind: "uups" })).to.be.revertedWithCustomError(bridge, "ZeroAddress");

            await expect(upgrades.deployProxy(Bridge, [
                admin.address, await gateway.getAddress(), klerosCore.address, "", XRPL_DEST
            ], { kind: "uups" })).to.be.revertedWithCustomError(bridge, "EmptyString");
        });
    });

    // ─────────────────────────────────────────────
    describe("registerEscrow", function () {
        it("stores state and emits event", async function () {
            await expect(
                bridge.connect(relayer).registerEscrow(
                    ESCROW_ID, DISPUTE_ID, AMOUNT, claimant.address, respondent.address
                )
            ).to.emit(bridge, "EscrowRegistered")
             .withArgs(ESCROW_ID, DISPUTE_ID, AMOUNT, claimant.address, respondent.address);

            expect(await bridge.getEscrowStatus(ESCROW_ID)).to.equal(Status.Registered);
            const esc = await bridge.getEscrow(ESCROW_ID);
            expect(esc.disputeID).to.equal(DISPUTE_ID);
            expect(esc.amount).to.equal(AMOUNT);
            expect(esc.claimant).to.equal(claimant.address);
            expect(esc.respondent).to.equal(respondent.address);
            expect(esc.released).to.equal(false);
        });

        it("rejects duplicate registration", async function () {
            await bridge.connect(relayer).registerEscrow(
                ESCROW_ID, DISPUTE_ID, AMOUNT, claimant.address, respondent.address
            );
            await expect(
                bridge.connect(relayer).registerEscrow(
                    ESCROW_ID, DISPUTE_ID, AMOUNT, claimant.address, respondent.address
                )
            ).to.be.revertedWithCustomError(bridge, "EscrowAlreadyRegistered");
        });

        it("non-GATEWAY_ROLE cannot call registerEscrow", async function () {
            await expect(
                bridge.connect(other).registerEscrow(
                    ESCROW_ID, DISPUTE_ID, AMOUNT, claimant.address, respondent.address
                )
            ).to.be.reverted;
        });
    });

    // ─────────────────────────────────────────────
    describe("releaseFunds", function () {
        beforeEach(async function () {
            await bridge.connect(relayer).registerEscrow(
                ESCROW_ID, DISPUTE_ID, AMOUNT, claimant.address, respondent.address
            );
        });

        it("transitions to ReleaseRequested and emits GMP call", async function () {
            await expect(bridge.connect(klerosCore).releaseFunds(ESCROW_ID, claimant.address))
                .to.emit(bridge, "FundsReleaseRequested")
                .withArgs(ESCROW_ID, DISPUTE_ID, claimant.address, AMOUNT);

            // Gateway received a callContract invocation
            await expect(bridge.connect(klerosCore).releaseFunds.staticCall(ESCROW_ID, claimant.address))
                .to.be.reverted; // second call now in ReleaseRequested state

            expect(await bridge.getEscrowStatus(ESCROW_ID)).to.equal(Status.ReleaseRequested);
        });

        it("rejects winner that is not a party", async function () {
            await expect(
                bridge.connect(klerosCore).releaseFunds(ESCROW_ID, other.address)
            ).to.be.revertedWithCustomError(bridge, "WinnerNotParty");
        });

        it("rejects double release", async function () {
            await bridge.connect(klerosCore).releaseFunds(ESCROW_ID, claimant.address);
            await expect(
                bridge.connect(klerosCore).releaseFunds(ESCROW_ID, claimant.address)
            ).to.be.revertedWithCustomError(bridge, "InvalidStatusTransition");
        });

        it("rejects release on unknown escrow", async function () {
            const unknown = ethers.keccak256(ethers.toUtf8Bytes("nope"));
            await expect(
                bridge.connect(klerosCore).releaseFunds(unknown, claimant.address)
            ).to.be.revertedWithCustomError(bridge, "EscrowNotRegistered");
        });

        it("non-KlerosCore cannot call releaseFunds", async function () {
            await expect(
                bridge.connect(other).releaseFunds(ESCROW_ID, claimant.address)
            ).to.be.reverted;
        });
    });

    // ─────────────────────────────────────────────
    describe("refundFunds", function () {
        beforeEach(async function () {
            await bridge.connect(relayer).registerEscrow(
                ESCROW_ID, DISPUTE_ID, AMOUNT, claimant.address, respondent.address
            );
        });

        it("transitions to RefundRequested and emits event", async function () {
            await expect(bridge.connect(klerosCore).refundFunds(ESCROW_ID))
                .to.emit(bridge, "FundsRefundRequested")
                .withArgs(ESCROW_ID, DISPUTE_ID);

            expect(await bridge.getEscrowStatus(ESCROW_ID)).to.equal(Status.RefundRequested);
        });

        it("non-KlerosCore cannot refund", async function () {
            await expect(bridge.connect(other).refundFunds(ESCROW_ID)).to.be.reverted;
        });
    });

    // ─────────────────────────────────────────────
    describe("retry + manual resolution", function () {
        beforeEach(async function () {
            await bridge.connect(relayer).registerEscrow(
                ESCROW_ID, DISPUTE_ID, AMOUNT, claimant.address, respondent.address
            );
            await bridge.connect(klerosCore).releaseFunds(ESCROW_ID, claimant.address);
        });

        it("retryRelease is permissionless and bumps counter", async function () {
            await expect(bridge.connect(other).retryRelease(ESCROW_ID))
                .to.emit(bridge, "RetryRequested")
                .withArgs(ESCROW_ID, 1);

            expect(await bridge.getRetryCount(ESCROW_ID)).to.equal(1);
        });

        it("hits MAX_RETRIES and marks Failed", async function () {
            await bridge.connect(other).retryRelease(ESCROW_ID); // 1
            await bridge.connect(other).retryRelease(ESCROW_ID); // 2
            await expect(bridge.connect(other).retryRelease(ESCROW_ID)) // 3 → Failed
                .to.emit(bridge, "EscrowFailed")
                .withArgs(ESCROW_ID, 3);

            expect(await bridge.getEscrowStatus(ESCROW_ID)).to.equal(Status.Failed);

            // 4th retry reverts
            await expect(bridge.connect(other).retryRelease(ESCROW_ID))
                .to.be.revertedWithCustomError(bridge, "NotRetryable");
        });

        it("guardian resolves a Failed escrow to Released", async function () {
            await bridge.connect(other).retryRelease(ESCROW_ID);
            await bridge.connect(other).retryRelease(ESCROW_ID);
            await bridge.connect(other).retryRelease(ESCROW_ID);

            await expect(bridge.connect(guardian).resolveManually(ESCROW_ID, Status.Released))
                .to.emit(bridge, "EscrowResolvedManually")
                .withArgs(ESCROW_ID, Status.Released, guardian.address);

            expect(await bridge.getEscrowStatus(ESCROW_ID)).to.equal(Status.Released);
        });

        it("guardian cannot resolve to an invalid status", async function () {
            await bridge.connect(other).retryRelease(ESCROW_ID);
            await bridge.connect(other).retryRelease(ESCROW_ID);
            await bridge.connect(other).retryRelease(ESCROW_ID);

            await expect(
                bridge.connect(guardian).resolveManually(ESCROW_ID, Status.RefundRequested)
            ).to.be.revertedWithCustomError(bridge, "ManualResolutionInvalid");
        });

        it("non-guardian cannot resolve manually", async function () {
            await bridge.connect(other).retryRelease(ESCROW_ID);
            await bridge.connect(other).retryRelease(ESCROW_ID);
            await bridge.connect(other).retryRelease(ESCROW_ID);

            await expect(
                bridge.connect(other).resolveManually(ESCROW_ID, Status.Released)
            ).to.be.reverted;
        });
    });

    // ─────────────────────────────────────────────
    describe("execute (GMP receive path)", function () {
        it("validates via gateway and registers escrow", async function () {
            const payload = ethers.AbiCoder.defaultAbiCoder().encode(
                ["bytes32", "uint256", "uint256", "address", "address"],
                [ESCROW_ID, DISPUTE_ID, AMOUNT, claimant.address, respondent.address]
            );
            const commandId = ethers.keccak256(ethers.toUtf8Bytes("cmd-1"));

            // MockAxelarGateway returns true for validateContractCall
            await expect(
                bridge.connect(other).execute(commandId, "xrpl", "source-addr", payload)
            ).to.emit(bridge, "EscrowRegistered")
             .withArgs(ESCROW_ID, DISPUTE_ID, AMOUNT, claimant.address, respondent.address);
        });
    });

    // ─────────────────────────────────────────────
    describe("Admin", function () {
        it("admin can rotate KlerosCore + chain config", async function () {
            await bridge.connect(admin).setKlerosCore(other.address);
            const KC = await bridge.KLEROS_CORE_ROLE();
            expect(await bridge.hasRole(KC, other.address)).to.be.true;

            await bridge.connect(admin).setChainConfig("xrpl-testnet", "rTestDest");
            expect(await bridge.xrplChainName()).to.equal("xrpl-testnet");
            expect(await bridge.xrplDestinationContract()).to.equal("rTestDest");
        });

        it("non-admin cannot rotate", async function () {
            await expect(bridge.connect(other).setKlerosCore(other.address)).to.be.reverted;
            await expect(bridge.connect(other).setChainConfig("x", "y")).to.be.reverted;
        });
    });
});
