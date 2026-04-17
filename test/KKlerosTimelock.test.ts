// test/KKlerosTimelock.test.ts
import { expect } from "chai";
import { deployFullSuite } from "./helpers/setup";

describe("KKlerosTimelock", function () {
  it("should deploy with correct MIN/MAX delays", async function () {
    const { timelock } = await deployFullSuite();
    expect(await timelock.MIN_DELAY()).to.equal(24 * 60 * 60);
    expect(await timelock.MAX_DELAY()).to.equal(14 * 24 * 60 * 60);
  });

  // TODO: queueTransaction, executeTransaction, cancelTransaction
});
