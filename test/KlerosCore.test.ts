// test/KlerosCore.test.ts
import { expect } from "chai";
import { deployFullSuite } from "./helpers/setup";

describe("KlerosCore", function () {
  it("should deploy and initialize correctly", async function () {
    const { core } = await deployFullSuite();
    expect(await core.disputeCount()).to.equal(0);
  });

  it("should have 4 courts configured", async function () {
    const { core } = await deployFullSuite();
    const general = await core.getCourtConfig(0); // General
    expect(general.minJurors).to.equal(3);
    expect(general.active).to.be.true;
  });

  // TODO: createDispute, assignArbitrator, closeEvidencePeriod, signAward, executeRuling, appeal
});
