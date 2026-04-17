import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { KlerosCore } from "../typechain-types";

describe("KlerosCore", function () {
    let klerosCore: KlerosCore;
    let admin: SignerWithAddress;
    let arbitrator: SignerWithAddress;
    let claimant: SignerWithAddress;
    let respondent: SignerWithAddress;
    let other: SignerWithAddress;

    // Mock addresses for modules (not deployed in unit tests)
    let mockDisputeKit: SignerWithAddress;
    let mockSortitionModule: SignerWithAddress;
    let mockEscrowBridge: SignerWithAddress;
    let daoTreasury: SignerWithAddress;
    let operationsWallet: SignerWithAddress;

    beforeEach(async function () {
        [admin, arbitrator, claimant, respondent, other,
         mockDisputeKit, mockSortitionModule, mockEscrowBridge,
         daoTreasury, operationsWallet] = await ethers.getSigners();

        const KlerosCore = await ethers.getContractFactory("KlerosCore");
        klerosCore = (await upgrades.deployProxy(KlerosCore, [
            admin.address,
            mockDisputeKit.address,
            mockSortitionModule.address,
            mockEscrowBridge.address,
            daoTreasury.address,
            operationsWallet.address
        ], { kind: "uups" })) as unknown as KlerosCore;
        await klerosCore.waitForDeployment();
    });

    describe("Initialization", function () {
        it("should set correct admin roles", async function () {
            const ADMIN_ROLE = await klerosCore.ADMIN_ROLE();
            expect(await klerosCore.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
        });

        it("should initialize court configs", async function () {
            const generalConfig = await klerosCore.getCourtConfig(0); // General
            expect(generalConfig.minJurors).to.equal(3);
            expect(generalConfig.active).to.be.true;

            const daoConfig = await klerosCore.getCourtConfig(3); // DAO
            expect(daoConfig.minJurors).to.equal(7);
        });

        it("should reject zero address in initialize", async function () {
            const KlerosCore = await ethers.getContractFactory("KlerosCore");
            await expect(
                upgrades.deployProxy(KlerosCore, [
                    ethers.ZeroAddress, // bad admin
                    mockDisputeKit.address,
                    mockSortitionModule.address,
                    mockEscrowBridge.address,
                    daoTreasury.address,
                    operationsWallet.address
                ], { kind: "uups" })
            ).to.be.revertedWithCustomError(klerosCore, "ZeroAddress");
        });
    });

    describe("Dispute Creation", function () {
        it("should create a dispute with correct fee", async function () {
            const disputeAmount = ethers.parseEther("100");
            const fee = ethers.parseEther("10"); // MIN_FEE (3% of 100 = 3, but min is 10)
            const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint8", "bytes32", "address", "address", "uint256"],
                [0, ethers.randomBytes(32), claimant.address, respondent.address, disputeAmount]
            );

            await expect(
                klerosCore.connect(claimant).createDispute(2, extraData, { value: fee })
            ).to.emit(klerosCore, "DisputeCreated");

            expect(await klerosCore.disputeCount()).to.equal(1);
        });

        it("should revert with invalid choices", async function () {
            const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint8", "bytes32", "address", "address", "uint256"],
                [0, ethers.randomBytes(32), claimant.address, respondent.address, ethers.parseEther("100")]
            );

            await expect(
                klerosCore.connect(claimant).createDispute(3, extraData, { value: ethers.parseEther("10") })
            ).to.be.revertedWithCustomError(klerosCore, "InvalidChoices");
        });

        it("should revert with insufficient fee", async function () {
            const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint8", "bytes32", "address", "address", "uint256"],
                [0, ethers.randomBytes(32), claimant.address, respondent.address, ethers.parseEther("100")]
            );

            await expect(
                klerosCore.connect(claimant).createDispute(2, extraData, { value: ethers.parseEther("1") })
            ).to.be.revertedWithCustomError(klerosCore, "InsufficientFee");
        });

        it("should revert with zero dispute amount", async function () {
            const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint8", "bytes32", "address", "address", "uint256"],
                [0, ethers.randomBytes(32), claimant.address, respondent.address, 0]
            );

            await expect(
                klerosCore.connect(claimant).createDispute(2, extraData, { value: ethers.parseEther("10") })
            ).to.be.revertedWithCustomError(klerosCore, "InsufficientDisputeAmount");
        });
    });

    describe("State Machine", function () {
        let disputeID: number;
        const escrowID = ethers.randomBytes(32);

        beforeEach(async function () {
            const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint8", "bytes32", "address", "address", "uint256"],
                [0, escrowID, claimant.address, respondent.address, ethers.parseEther("1000")]
            );
            const tx = await klerosCore.connect(claimant).createDispute(2, extraData, {
                value: ethers.parseEther("30") // 3% of 1000 = 30
            });
            disputeID = 0;
        });

        it("should assign arbitrator and transition to Evidence", async function () {
            await expect(
                klerosCore.connect(admin).assignArbitrator(disputeID, arbitrator.address)
            ).to.emit(klerosCore, "ArbitratorAssigned");

            const dispute = await klerosCore.getDispute(disputeID);
            expect(dispute.status).to.equal(2); // Evidence
        });

        it("should revert assignArbitrator on wrong status", async function () {
            await klerosCore.connect(admin).assignArbitrator(disputeID, arbitrator.address);

            await expect(
                klerosCore.connect(admin).assignArbitrator(disputeID, arbitrator.address)
            ).to.be.revertedWithCustomError(klerosCore, "InvalidStatusTransition");
        });

        it("should allow evidence submission in Evidence status", async function () {
            await klerosCore.connect(admin).assignArbitrator(disputeID, arbitrator.address);

            await expect(
                klerosCore.connect(claimant).submitEvidence(disputeID, "ipfs://QmEvidence1")
            ).to.emit(klerosCore, "EvidenceSubmitted");
        });

        it("should allow arbitrator to close evidence period early", async function () {
            await klerosCore.connect(admin).assignArbitrator(disputeID, arbitrator.address);

            await expect(
                klerosCore.connect(arbitrator).closeEvidencePeriod(disputeID)
            ).to.emit(klerosCore, "DisputeStatusChanged");

            const dispute = await klerosCore.getDispute(disputeID);
            expect(dispute.status).to.equal(3); // DualAward
        });
    });

    describe("Fee Calculation", function () {
        it("should apply MIN_FEE for small disputes", async function () {
            // 3% of 100 ETH = 3 ETH, but MIN_FEE = 10 ETH → should require 10 ETH
            const cost = await klerosCore.arbitrationCost("0x");
            expect(cost).to.equal(ethers.parseEther("10"));
        });
    });

    describe("View Functions", function () {
        it("should return dispute count", async function () {
            expect(await klerosCore.disputeCount()).to.equal(0);
        });

        it("should revert on invalid dispute ID", async function () {
            await expect(
                klerosCore.getDispute(999)
            ).to.be.revertedWithCustomError(klerosCore, "InvalidDisputeID");
        });
    });

    describe("Admin Functions", function () {
        it("should update court config", async function () {
            await klerosCore.connect(admin).updateCourtConfig(0, 5, ethers.parseEther("2000"), 0, true);
            const config = await klerosCore.getCourtConfig(0);
            expect(config.minJurors).to.equal(5);
        });

        it("should pause and unpause", async function () {
            await klerosCore.connect(admin).pause();
            // Creating dispute should fail when paused
            const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint8", "bytes32", "address", "address", "uint256"],
                [0, ethers.randomBytes(32), claimant.address, respondent.address, ethers.parseEther("100")]
            );
            await expect(
                klerosCore.connect(claimant).createDispute(2, extraData, { value: ethers.parseEther("10") })
            ).to.be.revertedWithCustomError(klerosCore, "EnforcedPause");

            await klerosCore.connect(admin).unpause();
        });
    });
});
