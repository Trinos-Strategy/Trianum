import { ethers } from "hardhat";

const ADDRESSES = {
  KlerosCore: "0x1BAC0e629fD897d69d4e67044f16B38A9270F24f",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const klerosCore = await ethers.getContractAt("KlerosCore", ADDRESSES.KlerosCore);

  // 1. 컨트랙트 paused 여부 확인
  try {
    const paused = await klerosCore.paused();
    console.log("paused:", paused);
  } catch(e) { console.log("paused() not found"); }

  // 2. Court 설정 확인
  for (let i = 0; i <= 3; i++) {
    try {
      const config = await klerosCore.getCourtConfig(i);
      console.log(`CourtType[${i}]:`, config);
    } catch(e: any) { console.log(`CourtType[${i}] error:`, e.message?.slice(0,80)); }
  }

  // 3. callStatic으로 정확한 revert reason 확인
  const DEAD = "0x000000000000000000000000000000000000dEaD";
  const escrowID = ethers.keccak256(ethers.toUtf8Bytes("test"));
  const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint8", "bytes32", "address", "address", "uint256"],
    [0, escrowID, deployer.address, DEAD, ethers.parseEther("1000")]
  );
  try {
    await klerosCore.createDispute.staticCall(2, extraData, { value: ethers.parseEther("10") });
    console.log("staticCall OK");
  } catch(e: any) {
    console.log("revert reason:", e.reason || e.message?.slice(0,200));
  }
}
main();
