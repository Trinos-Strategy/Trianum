import { ethers } from "hardhat";
const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const proxies: Record<string,string> = {
  TRNToken:        "0x91b14CCF775141A6B9c7E3E60BF85DDa5de255ef",
  SortitionModule: "0xFbdcC4d4f080f759E9B59f757e4c43A3A429763c",
  DisputeKit:      "0xBbbeb9f3004ED582A3eB1d7F96607418c41771Dc",
  EscrowBridge:    "0x8dBff83997190a896bB5CAe6B70FB741250E029F",
  KlerosCore:      "0x1BAC0e629fD897d69d4e67044f16B38A9270F24f",
  TrianumGovernor: "0x4eDdB2D27D1Da8D9e9020E31AB2a5b32D7a70A9E",
};
async function main() {
  for (const [name, proxy] of Object.entries(proxies)) {
    const raw = await ethers.provider.getStorage(proxy, IMPL_SLOT);
    const impl = "0x" + raw.slice(26);
    console.log(`${name.padEnd(20)} proxy: ${proxy} -> impl: ${impl}`);
  }
}
main();
