import { ethers, upgrades } from "hardhat";

export async function deployFullSuite() {
  const [admin, arbitrator, juror1, juror2, juror3, claimant, respondent, daoTreasury, operationsWallet] = await ethers.getSigners();

  // 1. Deploy KPNKToken
  const KPNKToken = await ethers.getContractFactory("KPNKToken");
  const kpnk = await upgrades.deployProxy(KPNKToken, [admin.address], { kind: "uups" });
  await kpnk.waitForDeployment();

  // 2. Deploy SortitionModule (admin, kpnk, klerosCore placeholder=admin — wired after KlerosCore deploys)
  const SortitionModule = await ethers.getContractFactory("SortitionModule");
  const sortition = await upgrades.deployProxy(SortitionModule, [
    admin.address,
    await kpnk.getAddress(),
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
  const EscrowBridge = await ethers.getContractFactory("EscrowBridge");
  const escrow = await upgrades.deployProxy(EscrowBridge, [
    await gateway.getAddress(),
    ethers.ZeroAddress, // gasService mock not needed for scaffold
    admin.address
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

  // 7. Deploy Governor + Timelock
  const Timelock = await ethers.getContractFactory("KKlerosTimelock");
  const timelock = await upgrades.deployProxy(Timelock, [admin.address], { kind: "uups" });
  await timelock.waitForDeployment();

  const Governor = await ethers.getContractFactory("KKlerosGovernor");
  const governor = await upgrades.deployProxy(Governor, [
    await kpnk.getAddress(),
    await timelock.getAddress(),
    admin.address
  ], { kind: "uups" });
  await governor.waitForDeployment();

  // 8. Wire up cross-references
  await (disputeKit as any).connect(admin).setKlerosCore(await core.getAddress());
  await (sortition as any).connect(admin).setKlerosCore(await core.getAddress());
  // TODO: grant OPERATOR_ROLE to KlerosCore on EscrowBridge, TRANSFER_CONTROLLER_ROLE on KPNK to SortitionModule

  return { admin, arbitrator, juror1, juror2, juror3, claimant, respondent, daoTreasury, operationsWallet, kpnk, sortition, disputeKit, core, escrow, gateway, governor, timelock };
}
