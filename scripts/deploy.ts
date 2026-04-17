import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. KPNKToken
  const KPNKToken = await ethers.getContractFactory("KPNKToken");
  const kpnk = await upgrades.deployProxy(KPNKToken, [deployer.address], { kind: "uups" });
  await kpnk.waitForDeployment();
  console.log("KPNKToken:", await kpnk.getAddress());

  // 2. SortitionModule (admin, kpnk, klerosCore placeholder=deployer — wired via setKlerosCore after KlerosCore deploys)
  const SortitionModule = await ethers.getContractFactory("SortitionModule");
  const sortition = await upgrades.deployProxy(SortitionModule, [
    deployer.address,
    await kpnk.getAddress(),
    deployer.address
  ], { kind: "uups" });
  await sortition.waitForDeployment();
  console.log("SortitionModule:", await sortition.getAddress());

  // 3. DisputeKit (admin, klerosCore placeholder=deployer — wired via setKlerosCore after KlerosCore deploys)
  const DisputeKit = await ethers.getContractFactory("DisputeKit");
  const disputeKit = await upgrades.deployProxy(DisputeKit, [deployer.address, deployer.address], { kind: "uups" });
  await disputeKit.waitForDeployment();
  console.log("DisputeKit:", await disputeKit.getAddress());

  // 4. EscrowBridge must be deployed before KlerosCore (which requires a non-zero escrow address)
  //    Init: (admin, gateway, klerosCore placeholder=deployer, xrplChainName, xrplDestinationContract)
  const AXELAR_GATEWAY = process.env.AXELAR_GATEWAY ?? ethers.ZeroAddress;
  const XRPL_CHAIN = process.env.XRPL_CHAIN_NAME ?? "xrpl";
  const XRPL_DEST = process.env.XRPL_DESTINATION_CONTRACT ?? "rTestDestinationAccount";
  if (AXELAR_GATEWAY === ethers.ZeroAddress) {
    throw new Error("AXELAR_GATEWAY env var required for EscrowBridge deployment");
  }
  const EscrowBridge = await ethers.getContractFactory("EscrowBridge");
  const escrow = await upgrades.deployProxy(EscrowBridge, [
    deployer.address,
    AXELAR_GATEWAY,
    deployer.address,
    XRPL_CHAIN,
    XRPL_DEST
  ], { kind: "uups" });
  await escrow.waitForDeployment();
  console.log("EscrowBridge:", await escrow.getAddress());

  // 5. KlerosCore (admin, disputeKit, sortition, escrow, daoTreasury, operationsWallet)
  const daoTreasury = process.env.DAO_TREASURY ?? deployer.address;
  const operationsWallet = process.env.OPERATIONS_WALLET ?? deployer.address;
  const KlerosCore = await ethers.getContractFactory("KlerosCore");
  const core = await upgrades.deployProxy(KlerosCore, [
    deployer.address,
    await disputeKit.getAddress(),
    await sortition.getAddress(),
    await escrow.getAddress(),
    daoTreasury,
    operationsWallet
  ], { kind: "uups" });
  await core.waitForDeployment();
  console.log("KlerosCore:", await core.getAddress());

  // 6. KKlerosTimelock
  const Timelock = await ethers.getContractFactory("KKlerosTimelock");
  const timelock = await upgrades.deployProxy(Timelock, [deployer.address], { kind: "uups" });
  await timelock.waitForDeployment();
  console.log("KKlerosTimelock:", await timelock.getAddress());

  // 7. KKlerosGovernor (legacy Phase-3 stub)
  const Governor = await ethers.getContractFactory("KKlerosGovernor");
  const governor = await upgrades.deployProxy(Governor, [
    await kpnk.getAddress(),
    await timelock.getAddress(),
    deployer.address
  ], { kind: "uups" });
  await governor.waitForDeployment();
  console.log("KKlerosGovernor:", await governor.getAddress());

  // 7b. Phase-1 DAO governance: OZ TimelockController + KlerosGovernor
  const TIMELOCK_MIN_DELAY = Number(process.env.TIMELOCK_MIN_DELAY ?? 24 * 60 * 60); // 24h default
  const VOTING_DELAY = Number(process.env.VOTING_DELAY ?? 7200);      // ~1d of 12s blocks
  const VOTING_PERIOD = Number(process.env.VOTING_PERIOD ?? 50400);   // ~7d of 12s blocks
  const PROPOSAL_THRESHOLD = process.env.PROPOSAL_THRESHOLD
    ? BigInt(process.env.PROPOSAL_THRESHOLD)
    : ethers.parseUnits("10000", 18);
  const QUORUM_PERCENT = Number(process.env.QUORUM_PERCENT ?? 4);

  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelockController = await TimelockController.deploy(
    TIMELOCK_MIN_DELAY,
    [],                      // proposers — granted to governor below
    [ethers.ZeroAddress],    // executors — anyone after delay
    deployer.address         // initial admin (renounce after setup)
  );
  await timelockController.waitForDeployment();
  console.log("TimelockController:", await timelockController.getAddress());

  const KlerosGovernor = await ethers.getContractFactory("KlerosGovernor");
  const klerosGovernor = await upgrades.deployProxy(
    KlerosGovernor,
    [
      await kpnk.getAddress(),
      await timelockController.getAddress(),
      deployer.address,
      VOTING_DELAY,
      VOTING_PERIOD,
      PROPOSAL_THRESHOLD,
      QUORUM_PERCENT,
    ],
    { kind: "uups" }
  );
  await klerosGovernor.waitForDeployment();
  console.log("KlerosGovernor:", await klerosGovernor.getAddress());

  const PROPOSER_ROLE = await (timelockController as any).PROPOSER_ROLE();
  const CANCELLER_ROLE = await (timelockController as any).CANCELLER_ROLE();
  await (timelockController as any).grantRole(PROPOSER_ROLE, await klerosGovernor.getAddress());
  await (timelockController as any).grantRole(CANCELLER_ROLE, await klerosGovernor.getAddress());
  console.log("KlerosGovernor -> TimelockController linked (PROPOSER + CANCELLER)");

  // 8. Wire access control
  await (disputeKit as any).setKlerosCore(await core.getAddress());
  await (sortition as any).setKlerosCore(await core.getAddress());
  await (escrow as any).setKlerosCore(await core.getAddress());
  await (kpnk as any).setSortitionModule(await sortition.getAddress());
  console.log("DisputeKit + SortitionModule + EscrowBridge -> KlerosCore linked");
  console.log("KPNKToken -> SortitionModule linked");
  // Seed deployer for local/testnet experimentation (skip on mainnet once you add a proper distribution plan)
  if (process.env.SEED_DEPLOYER === "true") {
    await (kpnk as any).initialDistribution(
      [deployer.address],
      [ethers.parseUnits("1000000000", 18)]
    );
    console.log("KPNKToken: initial 1B distributed to deployer");
  }
  // Optional: transfer ADMIN_ROLE on protocol contracts to the TimelockController
  // so governance owns them. Opt-in via TRANSFER_ADMIN_TO_TIMELOCK=true because
  // test harnesses typically expect the deployer to retain admin authority.
  if (process.env.TRANSFER_ADMIN_TO_TIMELOCK === "true") {
    const timelockAddr = await timelockController.getAddress();

    const ADMIN_ROLE_CORE = await (core as any).ADMIN_ROLE();
    await (core as any).grantRole(ADMIN_ROLE_CORE, timelockAddr);
    await (core as any).revokeRole(ADMIN_ROLE_CORE, deployer.address);

    const ADMIN_ROLE_SORT = await (sortition as any).ADMIN_ROLE();
    await (sortition as any).grantRole(ADMIN_ROLE_SORT, timelockAddr);
    await (sortition as any).revokeRole(ADMIN_ROLE_SORT, deployer.address);

    const ADMIN_ROLE_KPNK = await (kpnk as any).ADMIN_ROLE();
    await (kpnk as any).grantRole(ADMIN_ROLE_KPNK, timelockAddr);
    await (kpnk as any).revokeRole(ADMIN_ROLE_KPNK, deployer.address);

    const ADMIN_ROLE_ESC = await (escrow as any).ADMIN_ROLE();
    await (escrow as any).grantRole(ADMIN_ROLE_ESC, timelockAddr);
    await (escrow as any).revokeRole(ADMIN_ROLE_ESC, deployer.address);

    console.log("ADMIN_ROLE transferred to TimelockController on Core/Sortition/KPNK/Escrow");
  }

  console.log("\nDeployment complete. Remember to wire access control roles.");
}

main().catch(console.error);
