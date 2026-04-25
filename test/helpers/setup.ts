import { ethers, upgrades } from "hardhat";

export async function deployFullSuite() {
  const [admin, arbitrator, juror1, juror2, juror3, claimant, respondent, daoTreasury, operationsWallet] = await ethers.getSigners();

  // 1. Deploy TRNToken
  const TRNToken = await ethers.getContractFactory("TRNToken");
  const trn = await upgrades.deployProxy(TRNToken, [admin.address], { kind: "uups" });
  await trn.waitForDeployment();

  // 2. Deploy SortitionModule (admin, trn, klerosCore placeholder=admin — wired after KlerosCore deploys)
  const SortitionModule = await ethers.getContractFactory("SortitionModule");
  const sortition = await upgrades.deployProxy(SortitionModule, [
    admin.address,
    await trn.getAddress(),
    admin.address
  ], { kind: "uups" });
  await sortition.waitForDeployment();

  // 3. Deploy DisputeKit (admin, klerosCore placeholder=admin — updated after KlerosCore deploys)
  const DisputeKit = await ethers.getContractFactory("DisputeKit");
  const disputeKit = await upgrades.deployProxy(DisputeKit, [admin.address, admin.address], { kind: "uups" });
  await disputeKit.waitForDeployment();

  // 4. Deploy MockAxelarGateway
  const MockGateway = await ethers.getContractFactory("MockAxelarGateway");
  const gateway = await MockGateway.deploy();
  await gateway.waitForDeployment();

  // 5. Deploy EscrowBridge first so KlerosCore can reference it
  //    (admin, gateway, klerosCore placeholder=admin, xrplChainName, xrplDestinationContract)
  const EscrowBridge = await ethers.getContractFactory("EscrowBridge");
  const escrow = await upgrades.deployProxy(EscrowBridge, [
    admin.address,
    await gateway.getAddress(),
    admin.address,
    "xrpl",
    "rTestDestinationAccount"
  ], { kind: "uups" });
  await escrow.waitForDeployment();

  // 6. Deploy KlerosCore (admin, disputeKit, sortition, escrow, daoTreasury, operationsWallet)
  const KlerosCore = await ethers.getContractFactory("KlerosCore");
  const core = await upgrades.deployProxy(KlerosCore, [
    admin.address,
    await disputeKit.getAddress(),
    await sortition.getAddress(),
    await escrow.getAddress(),
    daoTreasury.address,
    operationsWallet.address
  ], { kind: "uups" });
  await core.waitForDeployment();

  // 7. Deploy Phase-1 DAO governance (OZ TimelockController + TrianumGovernor)
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelockController = await TimelockController.deploy(
    2, // minDelay (seconds) — tiny for test speed
    [],
    [ethers.ZeroAddress],
    admin.address
  );
  await timelockController.waitForDeployment();

  const TrianumGovernor = await ethers.getContractFactory("TrianumGovernor");
  const klerosGovernor = await upgrades.deployProxy(
    TrianumGovernor,
    [
      await trn.getAddress(),
      await timelockController.getAddress(),
      admin.address,
      1,                                      // votingDelay (blocks)
      10,                                     // votingPeriod (blocks)
      ethers.parseUnits("10000", 18),         // proposalThreshold
      4,                                      // quorumPercent (%)
    ],
    { kind: "uups" }
  );
  await klerosGovernor.waitForDeployment();

  // Link governor into the timelock as proposer/canceller
  const PROPOSER_ROLE = await (timelockController as any).PROPOSER_ROLE();
  const CANCELLER_ROLE = await (timelockController as any).CANCELLER_ROLE();
  await (timelockController as any).connect(admin).grantRole(PROPOSER_ROLE, await klerosGovernor.getAddress());
  await (timelockController as any).connect(admin).grantRole(CANCELLER_ROLE, await klerosGovernor.getAddress());

  // 8. Wire up cross-references
  await (disputeKit as any).connect(admin).setKlerosCore(await core.getAddress());
  await (sortition as any).connect(admin).setKlerosCore(await core.getAddress());
  await (escrow as any).connect(admin).setKlerosCore(await core.getAddress());
  await (trn as any).connect(admin).setSortitionModule(await sortition.getAddress());
  // Seed admin with the full TRN supply so downstream tests that assume funded admin still work
  await (trn as any)
    .connect(admin)
    .initialDistribution([admin.address], [ethers.parseUnits("1000000000", 18)]);

  return {
    admin, arbitrator, juror1, juror2, juror3, claimant, respondent, daoTreasury, operationsWallet,
    trn, sortition, disputeKit, core, escrow, gateway,
    klerosGovernor, timelockController,   // Phase-1 DAO governance
  };
}
