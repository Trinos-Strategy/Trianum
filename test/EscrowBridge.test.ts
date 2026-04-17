// test/EscrowBridge.test.ts
import { expect } from "chai";
import { deployFullSuite } from "./helpers/setup";

describe("EscrowBridge", function () {
  it("should deploy and initialize correctly", async function () {
    const { escrow } = await deployFullSuite();
    expect(await escrow.getAddress()).to.properAddress;
  });

  // TODO: createEscrow, releaseEscrow, refundEscrow, splitEscrow, bridgeToXRPL, Axelar execute()
});
