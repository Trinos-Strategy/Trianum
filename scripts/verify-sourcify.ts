import { run } from "hardhat";

const targets: Array<[string, string]> = [
  ["TRNToken",           "0xb22f7a13996fE4e1528B4b1Ae2f1ABABa32279af"],
  ["SortitionModule",    "0x82Ed29fFA3Dbdbb76B12Ce3d6308c3f612D64c81"],
  ["DisputeKit",         "0x0faead12c92f94559d84215140407a095D6549B1"],
  ["EscrowBridge",       "0x55D8FBCf86e77b6DbFc6A8693F9aF2741Dc72bde"],
  ["KlerosCore",         "0xF10D5ACD4e0597727769756b43698AC6d9e0042e"],
  ["TrianumGovernor",    "0xa999bba91E0d35E285E0198571B4CBA4aDd5CDef"],
  ["TimelockController", "0xdeEEb84c3A2CCfb3b640D91012fe0e1d33BEe438"],
];

async function main() {
  for (const [name, address] of targets) {
    console.log(`\n=== Sourcify verifying ${name} @ ${address} ===`);
    try {
      await run("verify:sourcify", { address });
      console.log(`  ✓ ${name} sourcify OK`);
    } catch (err) {
      console.error(`  ✗ ${name}:`, (err as Error).message);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
