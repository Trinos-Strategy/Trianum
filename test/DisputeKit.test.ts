// test/DisputeKit.test.ts
import { expect } from "chai";
import { deployFullSuite } from "./helpers/setup";

describe("DisputeKit", function () {
  it("should deploy and initialize correctly", async function () {
    const { disputeKit } = await deployFullSuite();
    expect(await disputeKit.getAddress()).to.properAddress;
  });

  // TODO: commitDualAward, startVoting, commitVote, revealVote, tallyVotes, resolveTie
});
