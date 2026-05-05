import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const network = await ethers.provider.getNetwork();
  console.log("ChainId  :", network.chainId.toString());
  console.log("Deployer :", deployer.address);
  console.log("Balance  :", ethers.formatEther(balance), "XRP");
}
main().catch((e) => { console.error(e); process.exit(1); });
