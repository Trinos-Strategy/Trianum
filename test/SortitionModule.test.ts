// test/SortitionModule.test.ts
import { expect } from "chai";
import { deployFullSuite } from "./helpers/setup";

describe("SortitionModule", function () {
  it("should deploy and initialize correctly", async function () {
    const { sortition } = await deployFullSuite();
    expect(await sortition.getAddress()).to.properAddress;
  });

  // TODO: stake, requestUnstake, executeUnstake, draw, penalize, reward
});
