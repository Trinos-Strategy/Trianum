import { expect } from "chai";
import { ethers, upgrades, network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { KPNKToken } from "../typechain-types";

const ONE = 10n ** 18n;
const ONE_BILLION = 1_000_000_000n * ONE;

describe("KPNKToken", function () {
  let token: KPNKToken;
  let admin: SignerWithAddress;
  let sortition: SignerWithAddress; // stand-in address that plays the SortitionModule role
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let other: SignerWithAddress;

  beforeEach(async function () {
    [admin, sortition, alice, bob, carol, other] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("KPNKToken");
    token = (await upgrades.deployProxy(Token, [admin.address], {
      kind: "uups",
    })) as unknown as KPNKToken;
    await token.waitForDeployment();

    // Wire SortitionModule role to a known signer so we can exercise the restriction whitelist
    await token.connect(admin).setSortitionModule(sortition.address);
  });

  // ─────────────────────────────────────────────────
  describe("Initialization", function () {
    it("has correct metadata and no supply minted", async function () {
      expect(await token.name()).to.equal("Korean Pinakion");
      expect(await token.symbol()).to.equal("K-PNK");
      expect(await token.decimals()).to.equal(18);
      expect(await token.totalSupply()).to.equal(0);
      expect(await token.totalDistributed()).to.equal(0);
      expect(await token.TOTAL_SUPPLY()).to.equal(ONE_BILLION);
    });

    it("rejects zero-address admin", async function () {
      const Token = await ethers.getContractFactory("KPNKToken");
      await expect(
        upgrades.deployProxy(Token, [ethers.ZeroAddress], { kind: "uups" })
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });

    it("grants admin + distributor roles to the admin", async function () {
      const ADMIN_ROLE = await token.ADMIN_ROLE();
      const DISTRIBUTOR_ROLE = await token.DISTRIBUTOR_ROLE();
      expect(await token.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await token.hasRole(DISTRIBUTOR_ROLE, admin.address)).to.be.true;
    });
  });

  // ─────────────────────────────────────────────────
  describe("Initial distribution", function () {
    it("mints to multiple recipients and updates totals", async function () {
      const amounts = [ONE * 100n, ONE * 200n, ONE * 300n];
      await expect(
        token.connect(admin).initialDistribution(
          [alice.address, bob.address, carol.address],
          amounts
        )
      ).to.emit(token, "InitialDistributionCompleted").withArgs(3, ONE * 600n);

      expect(await token.balanceOf(alice.address)).to.equal(amounts[0]);
      expect(await token.balanceOf(bob.address)).to.equal(amounts[1]);
      expect(await token.balanceOf(carol.address)).to.equal(amounts[2]);
      expect(await token.totalSupply()).to.equal(ONE * 600n);
      expect(await token.totalDistributed()).to.equal(ONE * 600n);
    });

    it("supports batched distribution that stays within the cap", async function () {
      await token.connect(admin).initialDistribution(
        [alice.address],
        [ONE_BILLION / 2n]
      );
      await token.connect(admin).initialDistribution(
        [bob.address],
        [ONE_BILLION / 2n]
      );

      expect(await token.totalDistributed()).to.equal(ONE_BILLION);
      expect(await token.totalSupply()).to.equal(ONE_BILLION);
    });

    it("reverts when distribution would exceed TOTAL_SUPPLY", async function () {
      await token.connect(admin).initialDistribution(
        [alice.address],
        [ONE_BILLION]
      );
      await expect(
        token.connect(admin).initialDistribution([bob.address], [1n])
      ).to.be.revertedWithCustomError(token, "DistributionExceedsSupply");
    });

    it("reverts on array length mismatch", async function () {
      await expect(
        token
          .connect(admin)
          .initialDistribution([alice.address, bob.address], [ONE])
      ).to.be.revertedWithCustomError(token, "ArrayLengthMismatch");
    });

    it("reverts on empty distribution", async function () {
      await expect(
        token.connect(admin).initialDistribution([], [])
      ).to.be.revertedWithCustomError(token, "EmptyDistribution");
    });

    it("non-distributor cannot mint", async function () {
      await expect(
        token.connect(other).initialDistribution([alice.address], [ONE])
      ).to.be.reverted; // AccessControlUnauthorizedAccount
    });

    it("revokeDistributorRole locks further minting", async function () {
      await token.connect(admin).revokeDistributorRole(admin.address);
      await expect(
        token.connect(admin).initialDistribution([alice.address], [ONE])
      ).to.be.reverted;
    });
  });

  // ─────────────────────────────────────────────────
  describe("Transfer restrictions", function () {
    beforeEach(async function () {
      await token
        .connect(admin)
        .initialDistribution(
          [alice.address, bob.address],
          [ONE * 1000n, ONE * 1000n]
        );
    });

    it("SortitionModule role sets & clears restrictions", async function () {
      await expect(
        token.connect(sortition).setTransferRestriction(alice.address, true)
      )
        .to.emit(token, "TransferRestrictionChanged")
        .withArgs(alice.address, true);

      expect(await token.isTransferRestricted(alice.address)).to.be.true;

      await token.connect(sortition).setTransferRestriction(alice.address, false);
      expect(await token.isTransferRestricted(alice.address)).to.be.false;
    });

    it("only SORTITION_MODULE_ROLE can toggle restrictions", async function () {
      await expect(
        token.connect(other).setTransferRestriction(alice.address, true)
      ).to.be.reverted;
    });

    it("restricted account cannot transfer to a random address", async function () {
      await token.connect(sortition).setTransferRestriction(alice.address, true);
      await expect(
        token.connect(alice).transfer(carol.address, ONE)
      ).to.be.revertedWithCustomError(token, "TransferRestrictedForAccount");
    });

    it("restricted account CAN transfer to the SortitionModule (staking)", async function () {
      await token.connect(sortition).setTransferRestriction(alice.address, true);
      await expect(
        token.connect(alice).transfer(sortition.address, ONE * 10n)
      ).to.not.be.reverted;
      expect(await token.balanceOf(sortition.address)).to.equal(ONE * 10n);
    });

    it("unrestriction re-enables free transfers", async function () {
      await token.connect(sortition).setTransferRestriction(alice.address, true);
      await token.connect(sortition).setTransferRestriction(alice.address, false);
      await expect(
        token.connect(alice).transfer(carol.address, ONE)
      ).to.not.be.reverted;
      expect(await token.balanceOf(carol.address)).to.equal(ONE);
    });

    it("unrestricted account always transfers freely", async function () {
      await expect(
        token.connect(bob).transfer(carol.address, ONE * 5n)
      ).to.not.be.reverted;
    });
  });

  // ─────────────────────────────────────────────────
  describe("Governance (ERC20Votes)", function () {
    beforeEach(async function () {
      await token
        .connect(admin)
        .initialDistribution([alice.address], [ONE_BILLION / 10n]); // 10% of supply
    });

    it("delegates voting power to self", async function () {
      await token.connect(alice).delegate(alice.address);
      expect(await token.getVotes(alice.address)).to.equal(ONE_BILLION / 10n);
    });

    it("getVotesWithCap caps at 5% of TOTAL_SUPPLY", async function () {
      await token.connect(alice).delegate(alice.address);
      const cap = (ONE_BILLION * 500n) / 10_000n; // 5%
      expect(await token.getVotesWithCap(alice.address)).to.equal(cap);
    });

    it("getVotesWithCap returns raw votes when below cap", async function () {
      // Mint a tiny amount to bob and delegate
      await token.connect(admin).initialDistribution([bob.address], [ONE * 100n]);
      await token.connect(bob).delegate(bob.address);
      expect(await token.getVotesWithCap(bob.address)).to.equal(ONE * 100n);
    });
  });

  // ─────────────────────────────────────────────────
  describe("ERC20Permit", function () {
    it.skip("accepts a valid permit signature and sets allowance", async function () {
      await token
        .connect(admin)
        .initialDistribution([alice.address], [ONE * 1000n]);

      const value = ONE * 42n;
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const nonce = await token.nonces(alice.address);

      const { chainId } = await ethers.provider.getNetwork();
      const name = await token.name();
      const version = "1";

      const domain = {
        name,
        version,
        chainId,
        verifyingContract: await token.getAddress(),
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const message = {
        owner: alice.address,
        spender: bob.address,
        value,
        nonce,
        deadline,
      };

      const signature = await alice.signTypedData(domain, types, message);
      const sig = ethers.Signature.from(signature);

      await token.permit(
        alice.address,
        bob.address,
        value,
        deadline,
        sig.v,
        sig.r,
        sig.s
      );

      expect(await token.allowance(alice.address, bob.address)).to.equal(value);
      expect(await token.nonces(alice.address)).to.equal(nonce + 1n);
    });
  });
});
