import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. KPNKToken
  const KPNKToken = await ethers.getContractFactory("KPNKToken");
  const kpnk = await upgrades.deployProxy(KPNKToken, [deployer.address], { kind: "uups" });
  await kpnk.waitForDeployment();
  console.log("KPNKToken:", await kpnk.getAddress());

  // 2. SortitionModule
  const SortitionModule = await ethers.getContractFactory("SortitionModule");
  const sortition = await upgrades.deployProxy(SortitionModule, [await kpnk.getAddress(), deployer.address], { kind: "uups" });
  await sortition.waitForDeployment();
  console.log("SortitionModule:", await sortition.getAddress());

  // 3. DisputeKit
  const DisputeKit = await ethers.getContractFactory("DisputeKit");
  const disputeKit = await upgrades.deployProxy(DisputeKit, [deployer.address], { kind: "uups" });
  await disputeKit.waitForDeployment();
  console.log("DisputeKit:", await disputeKit.getAddress());

  // 4. KlerosCore (EscrowBridge = ZeroAddress, set later)
  const KlerosCore = await ethers.getContractFactory("KlerosCore");
  const core = await upgrades.deployProxy(KlerosCore, [
    await disputeKit.getAddress(),
    await sortition.getAddress(),
    ethers.ZeroAddress,
    deployer.address
  ], { kind: "uups" });
  await core.waitForDeployment();
  console.log("KlerosCore:", await core.getAddress());

  // 5. EscrowBridge (needs Axelar Gateway + GasService addresses for target network)
  // const AXELAR_GATEWAY = "0x...";      // Set per network
  // const AXELAR_GAS_SERVICE = "0x...";  // Set per network
  // const EscrowBridge = await ethers.getContractFactory("EscrowBridge");
  // const escrow = await upgrades.deployProxy(EscrowBridge, [AXELAR_GATEWAY, AXELAR_GAS_SERVICE, deployer.address], { kind: "uups" });

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
  // TODO: Grant OPERATOR_ROLE on SortitionModule/DisputeKit to KlerosCore
  // TODO: Grant TRANSFER_CONTROLLER_ROLE on KPNKToken to SortitionModule
  // TODO: Set EscrowBridge on KlerosCore
  // TODO: Grant GOVERNOR_ROLE on KlerosCore to Governor

  console.log("\n✅ Deployment complete. Remember to wire access control roles.");
}

main().catch(console.error);
