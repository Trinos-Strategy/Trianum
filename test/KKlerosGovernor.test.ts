// test/KKlerosGovernor.test.ts
import { expect } from "chai";
import { deployFullSuite } from "./helpers/setup";

describe("KKlerosGovernor", function () {
  it("should deploy and initialize correctly", async function () {
    const { governor } = await deployFullSuite();
    expect(await governor.paused()).to.be.false;
  });

  it("should expose correct quorum + approval thresholds per proposal type", async function () {
    const { governor } = await deployFullSuite();
    expect(await governor.quorumRequired(0)).to.equal(1000); // ParameterChange 10%
    expect(await governor.approvalThreshold(7)).to.equal(7500); // ConstitutionChange 75%
  });

  // TODO: propose, castVote, execute, cancel, emergencyPause/Unpause, veto
});
