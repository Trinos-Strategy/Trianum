import { run } from "hardhat";

const DEPLOYER = "0x307844674A4F66a6b534A1B98aF8596CF9965fb5";
const ZERO = "0x0000000000000000000000000000000000000000";

const TIMELOCK_MIN_DELAY = Number(process.env.TIMELOCK_MIN_DELAY ?? 24 * 60 * 60); // 86400
const TIMELOCK_PROPOSERS: string[] = [];           // deploy.ts: []
const TIMELOCK_EXECUTORS: string[] = [ZERO];        // deploy.ts: [ethers.ZeroAddress]
const TIMELOCK_ADMIN = DEPLOYER;                    // deploy.ts: deployer.address

async function main() {
  const proxies: Record<string, string> = {
    TRNToken:        "0x91b14CCF775141A6B9c7E3E60BF85DDa5de255ef",
    SortitionModule: "0xFbdcC4d4f080f759E9B59f757e4c43A3A429763c",
    DisputeKit:      "0xBbbeb9f3004ED582A3eB1d7F96607418c41771Dc",
    EscrowBridge:    "0x8dBff83997190a896bB5CAe6B70FB741250E029F",
    KlerosCore:      "0x1BAC0e629fD897d69d4e67044f16B38A9270F24f",
    TrianumGovernor: "0x4eDdB2D27D1Da8D9e9020E31AB2a5b32D7a70A9E",
  };

  for (const [name, address] of Object.entries(proxies)) {
    console.log(`\n=== Verifying ${name} (proxy ${address}) ===`);
    try {
      await run("verify:verify", { address, constructorArguments: [] });
      console.log(`  ✓ ${name} verified`);
    } catch (err) {
      console.error(`  ✗ ${name}:`, (err as Error).message);
    }
  }

  console.log(`\n=== Verifying TimelockController (non-proxy) ===`);
  try {
    await run("verify:verify", {
      address: "0xdeEEb84c3A2CCfb3b640D91012fe0e1d33BEe438",
      constructorArguments: [
        TIMELOCK_MIN_DELAY,
        TIMELOCK_PROPOSERS,
        TIMELOCK_EXECUTORS,
        TIMELOCK_ADMIN,
      ],
      contract: "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController",
    });
    console.log("  ✓ TimelockController verified");
  } catch (err) {
    console.error("  ✗ TimelockController:", (err as Error).message);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
