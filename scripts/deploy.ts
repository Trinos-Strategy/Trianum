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
  const AXELAR_GATEWAY = process.env.AXELAR_GATEWAY ?? ethers.ZeroAddress;
  const AXELAR_GAS_SERVICE = process.env.AXELAR_GAS_SERVICE ?? ethers.ZeroAddress;
  const EscrowBridge = await ethers.getContractFactory("EscrowBridge");
  const escrow = await upgrades.deployProxy(EscrowBridge, [
    AXELAR_GATEWAY,
    AXELAR_GAS_SERVICE,
    deployer.address
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

  // 7. KKlerosGovernor
  const Governor = await ethers.getContractFactory("KKlerosGovernor");
  const governor = await upgrades.deployProxy(Governor, [
    await kpnk.getAddress(),
    await timelock.getAddress(),
    deployer.address
  ], { kind: "uups" });
  await governor.waitForDeployment();
  console.log("KKlerosGovernor:", await governor.getAddress());

  // 8. Wire access control
  await (disputeKit as any).setKlerosCore(await core.getAddress());
  await (sortition as any).setKlerosCore(await core.getAddress());
  console.log("DisputeKit + SortitionModule -> KlerosCore linked");
  // TODO: Grant OPERATOR_ROLE on EscrowBridge to KlerosCore
  // TODO: Grant TRANSFER_CONTROLLER_ROLE on KPNKToken to SortitionModule
  // TODO: Grant GOVERNOR_ROLE on KlerosCore to Governor

  console.log("\nDeployment complete. Remember to wire access control roles.");
}

main().catch(console.error);
