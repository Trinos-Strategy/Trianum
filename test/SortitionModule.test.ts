import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { MockERC20, SortitionModule } from "../typechain-types";

const ONE_K = ethers.parseEther("1000");
const COURT_GENERAL = 0;
const COURT_DEFI = 1;

describe("SortitionModule", function () {
    let sortition: SortitionModule;
    let token: MockERC20;

    let admin: SignerWithAddress;
    let klerosCore: SignerWithAddress; // mock
    let juror1: SignerWithAddress;
    let juror2: SignerWithAddress;
    let juror3: SignerWithAddress;
    let juror4: SignerWithAddress;
    let juror5: SignerWithAddress;
    let other: SignerWithAddress;

    async function deploy() {
        const Mock = await ethers.getContractFactory("MockERC20");
        token = (await Mock.deploy("Mock K-PNK", "mKPNK")) as unknown as MockERC20;
        await token.waitForDeployment();

        const Sortition = await ethers.getContractFactory("SortitionModule");
        sortition = (await upgrades.deployProxy(Sortition, [
            admin.address,
            await token.getAddress(),
            klerosCore.address,
        ], { kind: "uups" })) as unknown as SortitionModule;
        await sortition.waitForDeployment();

        // Fund jurors and approve contract
        const signers = [juror1, juror2, juror3, juror4, juror5];
        for (const j of signers) {
            await token.mint(j.address, ethers.parseEther("1000000"));
            await token.connect(j).approve(await sortition.getAddress(), ethers.MaxUint256);
        }
    }

    beforeEach(async function () {
        [admin, klerosCore, juror1, juror2, juror3, juror4, juror5, other] = await ethers.getSigners();
        await deploy();
    });

    // ──────────────────────────────────────────────
    describe("Initialization", function () {
        it("sets roles, token, and klerosCore", async function () {
            const ADMIN_ROLE = await sortition.ADMIN_ROLE();
            const KLEROS_CORE_ROLE = await sortition.KLEROS_CORE_ROLE();

            expect(await sortition.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
            expect(await sortition.hasRole(KLEROS_CORE_ROLE, klerosCore.address)).to.be.true;
            expect(await sortition.kpnkToken()).to.equal(await token.getAddress());
            expect(await sortition.klerosCore()).to.equal(klerosCore.address);
        });

        it("rejects zero addresses at init", async function () {
            const Sortition = await ethers.getContractFactory("SortitionModule");
            await expect(
                upgrades.deployProxy(Sortition, [
                    ethers.ZeroAddress, await token.getAddress(), klerosCore.address
                ], { kind: "uups" })
            ).to.be.revertedWithCustomError(sortition, "ZeroAddress");
        });
    });

    // ──────────────────────────────────────────────
    describe("Staking", function () {
        it("stake transfers tokens and records state", async function () {
            const amt = ONE_K * 3n; // 3,000
            await expect(sortition.connect(juror1).stake(COURT_GENERAL, amt))
                .to.emit(sortition, "Staked")
                .withArgs(juror1.address, COURT_GENERAL, amt, amt);

            expect(await sortition.getStake(juror1.address, COURT_GENERAL)).to.equal(amt);
            expect(await sortition.getTotalStaked(COURT_GENERAL)).to.equal(amt);
            expect(await sortition.getCourtJurorCount(COURT_GENERAL)).to.equal(1);
            expect(await sortition.getCourtJuror(COURT_GENERAL, 0)).to.equal(juror1.address);
            expect(await token.balanceOf(await sortition.getAddress())).to.equal(amt);
        });

        it("rejects zero amount and invalid court", async function () {
            await expect(sortition.connect(juror1).stake(COURT_GENERAL, 0))
                .to.be.revertedWithCustomError(sortition, "ZeroAmount");
            await expect(sortition.connect(juror1).stake(99, ONE_K))
                .to.be.revertedWithCustomError(sortition, "InvalidCourt");
        });

        it("re-staking adds to existing balance without duplicating juror list", async function () {
            await sortition.connect(juror1).stake(COURT_GENERAL, ONE_K);
            await sortition.connect(juror1).stake(COURT_GENERAL, ONE_K * 2n);

            expect(await sortition.getStake(juror1.address, COURT_GENERAL)).to.equal(ONE_K * 3n);
            expect(await sortition.getCourtJurorCount(COURT_GENERAL)).to.equal(1);
        });

        it("supports the same juror staking across multiple courts", async function () {
            await sortition.connect(juror1).stake(COURT_GENERAL, ONE_K);
            await sortition.connect(juror1).stake(COURT_DEFI, ONE_K * 5n);

            expect(await sortition.getStake(juror1.address, COURT_GENERAL)).to.equal(ONE_K);
            expect(await sortition.getStake(juror1.address, COURT_DEFI)).to.equal(ONE_K * 5n);
            expect(await sortition.getCourtJurorCount(COURT_GENERAL)).to.equal(1);
            expect(await sortition.getCourtJurorCount(COURT_DEFI)).to.equal(1);
        });
    });

    // ──────────────────────────────────────────────
    describe("Unstaking", function () {
        beforeEach(async function () {
            await sortition.connect(juror1).stake(COURT_GENERAL, ONE_K * 10n);
        });

        it("request → 7-day cooldown → execute returns tokens", async function () {
            const before = await token.balanceOf(juror1.address);

            await sortition.connect(juror1).requestUnstake(COURT_GENERAL, ONE_K * 4n);
            const req = await sortition.getUnstakeRequest(juror1.address, COURT_GENERAL);
            expect(req.amount).to.equal(ONE_K * 4n);

            await time.increase(7 * 24 * 3600 + 1);

            await expect(sortition.connect(juror1).executeUnstake(COURT_GENERAL))
                .to.emit(sortition, "UnstakeExecuted")
                .withArgs(juror1.address, COURT_GENERAL, ONE_K * 4n);

            expect(await sortition.getStake(juror1.address, COURT_GENERAL)).to.equal(ONE_K * 6n);
            expect(await sortition.getTotalStaked(COURT_GENERAL)).to.equal(ONE_K * 6n);
            expect(await token.balanceOf(juror1.address)).to.equal(before + ONE_K * 4n);
        });

        it("rejects execute before cooldown", async function () {
            await sortition.connect(juror1).requestUnstake(COURT_GENERAL, ONE_K);
            await expect(sortition.connect(juror1).executeUnstake(COURT_GENERAL))
                .to.be.revertedWithCustomError(sortition, "CooldownNotElapsed");
        });

        it("rejects request while juror is in active dispute", async function () {
            // Give klerosCore signer the role and draw juror1 into a dispute.
            await sortition.connect(juror2).stake(COURT_GENERAL, ONE_K * 10n);
            await sortition.connect(juror3).stake(COURT_GENERAL, ONE_K * 10n);
            await sortition.connect(klerosCore).draw(42, COURT_GENERAL, 3, 1);

            await expect(sortition.connect(juror1).requestUnstake(COURT_GENERAL, ONE_K))
                .to.be.revertedWithCustomError(sortition, "JurorHasActiveDisputes");
        });

        it("rejects duplicate pending unstake", async function () {
            await sortition.connect(juror1).requestUnstake(COURT_GENERAL, ONE_K);
            await expect(sortition.connect(juror1).requestUnstake(COURT_GENERAL, ONE_K))
                .to.be.revertedWithCustomError(sortition, "PendingUnstakeExists");
        });

        it("executing a full unstake removes juror from court pool", async function () {
            await sortition.connect(juror1).requestUnstake(COURT_GENERAL, ONE_K * 10n);
            await time.increase(7 * 24 * 3600 + 1);
            await sortition.connect(juror1).executeUnstake(COURT_GENERAL);

            expect(await sortition.getCourtJurorCount(COURT_GENERAL)).to.equal(0);
            expect(await sortition.getStake(juror1.address, COURT_GENERAL)).to.equal(0);
        });
    });

    // ──────────────────────────────────────────────
    describe("Drawing", function () {
        beforeEach(async function () {
            await sortition.connect(juror1).stake(COURT_GENERAL, ONE_K);
            await sortition.connect(juror2).stake(COURT_GENERAL, ONE_K * 2n);
            await sortition.connect(juror3).stake(COURT_GENERAL, ONE_K * 3n);
            await sortition.connect(juror4).stake(COURT_GENERAL, ONE_K * 4n);
            await sortition.connect(juror5).stake(COURT_GENERAL, ONE_K * 5n);
        });

        it("draws unique jurors and increments activeDisputeCount", async function () {
            const tx = await sortition.connect(klerosCore).draw(1, COURT_GENERAL, 3, 1);
            const receipt = await tx.wait();
            const drawnEvents = receipt!.logs
                .map(l => { try { return sortition.interface.parseLog(l as any); } catch { return null; } })
                .filter(e => e && e.name === "JurorDrawn");
            expect(drawnEvents.length).to.equal(3);

            const drawn: string[] = drawnEvents.map(e => e!.args.juror);
            const uniq = new Set(drawn);
            expect(uniq.size).to.equal(3);

            for (const j of drawn) {
                expect(await sortition.isJurorActive(j)).to.be.true;
                expect(await sortition.wasDrawn(1, j)).to.be.true;
            }
        });

        it("reverts when pool is smaller than the requested count", async function () {
            await expect(sortition.connect(klerosCore).draw(2, COURT_GENERAL, 10, 1))
                .to.be.revertedWithCustomError(sortition, "NotEnoughJurors");
        });

        it("rejects non-KlerosCore caller", async function () {
            await expect(sortition.connect(other).draw(3, COURT_GENERAL, 1, 1))
                .to.be.reverted; // AccessControlUnauthorizedAccount
        });

        it("rejects zero count", async function () {
            await expect(sortition.connect(klerosCore).draw(4, COURT_GENERAL, 0, 1))
                .to.be.revertedWithCustomError(sortition, "DrawCountZero");
        });
    });

    // ──────────────────────────────────────────────
    describe("Penalize & Reward", function () {
        beforeEach(async function () {
            await sortition.connect(juror1).stake(COURT_GENERAL, ONE_K * 10n);
            await sortition.connect(juror2).stake(COURT_GENERAL, ONE_K * 10n);
            await sortition.connect(juror3).stake(COURT_GENERAL, ONE_K * 10n);
            await sortition.connect(klerosCore).draw(1, COURT_GENERAL, 3, 1);
        });

        it("penalize slashes 10% and clears the active-dispute slot", async function () {
            const before = await sortition.getStake(juror1.address, COURT_GENERAL);
            const tx = await sortition.connect(klerosCore).penalize(juror1.address, 1);
            await tx.wait();

            const after = await sortition.getStake(juror1.address, COURT_GENERAL);
            expect(before - after).to.equal(before / 10n); // 10%
            expect(await sortition.isJurorActive(juror1.address)).to.be.false;
            expect(await sortition.wasDrawn(1, juror1.address)).to.be.false;
        });

        it("penalize reverts for a juror not drawn in that dispute", async function () {
            await expect(sortition.connect(klerosCore).penalize(other.address, 1))
                .to.be.revertedWithCustomError(sortition, "NotDrawnForDispute");
        });

        it("reward transfers tokens to the juror and clears slot", async function () {
            // Seed contract with reward funds
            await token.mint(await sortition.getAddress(), ONE_K);

            const balBefore = await token.balanceOf(juror2.address);
            await sortition.connect(klerosCore).reward(juror2.address, 1, ONE_K);
            const balAfter = await token.balanceOf(juror2.address);

            expect(balAfter - balBefore).to.equal(ONE_K);
            expect(await sortition.isJurorActive(juror2.address)).to.be.false;
        });

        it("reward reverts if contract balance is insufficient", async function () {
            const hugeAmount = ethers.parseEther("10000000000");
            await expect(sortition.connect(klerosCore).reward(juror3.address, 1, hugeAmount))
                .to.be.revertedWithCustomError(sortition, "InsufficientContractBalance");
        });

        it("non-KlerosCore cannot call penalize / reward", async function () {
            await expect(sortition.connect(other).penalize(juror1.address, 1)).to.be.reverted;
            await expect(sortition.connect(other).reward(juror1.address, 1, 1)).to.be.reverted;
        });
    });

    // ──────────────────────────────────────────────
    describe("Admin", function () {
        it("admin can rotate KlerosCore address", async function () {
            await sortition.connect(admin).setKlerosCore(other.address);
            const KLEROS_CORE_ROLE = await sortition.KLEROS_CORE_ROLE();
            expect(await sortition.hasRole(KLEROS_CORE_ROLE, other.address)).to.be.true;
            expect(await sortition.hasRole(KLEROS_CORE_ROLE, klerosCore.address)).to.be.false;
        });

        it("non-admin cannot rotate KlerosCore", async function () {
            await expect(sortition.connect(other).setKlerosCore(other.address)).to.be.reverted;
        });
    });
});
