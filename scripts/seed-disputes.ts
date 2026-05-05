import { ethers } from "hardhat";

const ADDRESSES = {
  KlerosCore: "0x1BAC0e629fD897d69d4e67044f16B38A9270F24f",
};

const MIN_FEE = ethers.parseEther("10");
const BPS = 10000n;
const TOTAL_FEE_BPS = 300n;

function calcFee(disputeAmount: bigint): bigint {
  const pct = (disputeAmount * TOTAL_FEE_BPS) / BPS;
  return pct > MIN_FEE ? pct : MIN_FEE;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "XRP");

  // Deploy MockArbitrable
  console.log("\n--- Deploying MockArbitrable ---");
  const MockArbitrable = await ethers.getContractFactory("MockArbitrable");
  const mock = await MockArbitrable.deploy(ADDRESSES.KlerosCore);
  await mock.waitForDeployment();
  console.log("MockArbitrable:", await mock.getAddress());

  const klerosCore = await ethers.getContractAt("KlerosCore", ADDRESSES.KlerosCore);

  // disputeAmount < 333 XRP → fee = MIN_FEE = 10 XRP
  const DEAD = "0x000000000000000000000000000000000000dEaD";
  const seeds = [
    { name: "KFIP-Demo-1: DeFi Rug Pull",  court: 1, amount: ethers.parseEther("100") },
    { name: "KFIP-Demo-2: NFT Ownership",   court: 2, amount: ethers.parseEther("200") },
    { name: "KFIP-Demo-3: General Breach",  court: 0, amount: ethers.parseEther("300") },
  ];

  const results: any[] = [];

  for (const s of seeds) {
    const fee = calcFee(s.amount);
    console.log(`\n[+] ${s.name}`);
    console.log(`    disputeAmount: ${ethers.formatEther(s.amount)} XRP, fee: ${ethers.formatEther(fee)} XRP`);

    const escrowID = ethers.keccak256(ethers.toUtf8Bytes(s.name));
    const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint8", "bytes32", "address", "address", "uint256"],
      [s.court, escrowID, deployer.address, DEAD, s.amount]
    );

    try {
      const tx = await mock.createDispute(extraData, { value: fee });
      const receipt = await tx.wait();
      const count = await klerosCore.disputeCount();
      const disputeID = (count - 1n).toString();
      console.log("    disputeID:", disputeID, "| tx:", receipt?.hash);
      results.push({ name: s.name, disputeID, status: "OK" });
    } catch (err: any) {
      console.error("    ERROR:", err.reason || err.message?.slice(0, 150));
      results.push({ name: s.name, status: "FAIL", error: err.reason || err.message?.slice(0,80) });
    }
  }

  console.log("\n========== RESULTS ==========");
  console.table(results);
  console.log("Final dispute count:", (await klerosCore.disputeCount()).toString());
}

main().catch(e => { console.error(e); process.exit(1); });
