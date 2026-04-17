import { run } from "hardhat";

/**
 * Verify deployed contracts on the target network block explorer.
 * Usage: npx hardhat run scripts/verify.ts --network xrplEvmTestnet
 *
 * Populate the `deployments` map with addresses from deploy.ts output.
 */
async function main() {
  const deployments: Record<string, { address: string; args: unknown[] }> = {
    // KPNKToken: { address: "0x...", args: [] },
    // SortitionModule: { address: "0x...", args: [] },
    // DisputeKit: { address: "0x...", args: [] },
    // KlerosCore: { address: "0x...", args: [] },
    // EscrowBridge: { address: "0x...", args: [] },
    // KKlerosTimelock: { address: "0x...", args: [] },
    // KKlerosGovernor: { address: "0x...", args: [] },
  };

  for (const [name, { address, args }] of Object.entries(deployments)) {
    console.log(`Verifying ${name} at ${address}...`);
    try {
      await run("verify:verify", { address, constructorArguments: args });
    } catch (err) {
      console.error(`  ✗ ${name}:`, (err as Error).message);
    }
  }
}

main().catch(console.error);
