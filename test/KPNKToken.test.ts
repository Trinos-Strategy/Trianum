// test/KPNKToken.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFullSuite } from "./helpers/setup";

describe("KPNKToken", function () {
  it("should deploy with 1B total supply minted to admin", async function () {
    const { kpnk, admin } = await deployFullSuite();
    const expected = ethers.parseUnits("1000000000", 18);
    expect(await kpnk.totalSupply()).to.equal(expected);
    expect(await kpnk.balanceOf(admin.address)).to.equal(expected);
  });

  // TODO: setTransferRestriction, ERC20Votes delegate/getVotes, ERC20Permit flow, initialDistribution
});
