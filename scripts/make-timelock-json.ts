import { readFileSync, writeFileSync } from "fs";
const buildInfo = JSON.parse(
  readFileSync("artifacts/build-info/" +
    require("fs").readdirSync("artifacts/build-info")[0], "utf8")
);
const input = buildInfo.input;
// Keep only TimelockController related sources
const filtered: any = { language: "Solidity", sources: {}, settings: input.settings };
const target = "@openzeppelin/contracts/governance/TimelockController.sol";
// Include all sources (Blockscout needs the full dependency tree)
filtered.sources = input.sources;
writeFileSync("min-json/TimelockController.json", JSON.stringify(filtered));
console.log("Written min-json/TimelockController.json");
