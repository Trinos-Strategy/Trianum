import * as fs from "fs";
import * as path from "path";
import { globSync } from "glob";

const TARGETS = [
  { name: "TRNToken",        src: "contracts/token/TRNToken.sol" },
  { name: "SortitionModule", src: "contracts/modules/SortitionModule.sol" },
  { name: "DisputeKit",      src: "contracts/modules/DisputeKit.sol" },
  { name: "EscrowBridge",    src: "contracts/modules/EscrowBridge.sol" },
  { name: "KlerosCore",      src: "contracts/core/KlerosCore.sol" },
  { name: "TrianumGovernor", src: "contracts/governance/TrianumGovernor.sol" },
];

function main() {
  const biFiles: string[] = globSync("artifacts/build-info/*.json");
  if (!biFiles || biFiles.length === 0) {
    console.error("No build-info found. Run: npx hardhat compile");
    process.exit(1);
  }
  biFiles.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  console.log(`Using build-info: ${biFiles[0]}`);

  const bi = JSON.parse(fs.readFileSync(biFiles[0], "utf8"));
  const allInput = bi.input;
  console.log(`Total sources in build-info: ${Object.keys(allInput.sources).length}`);

  function findDeps(entry: string, seen = new Set<string>()): Set<string> {
    if (seen.has(entry)) return seen;
    seen.add(entry);
    const src = allInput.sources[entry];
    if (!src || !src.content) return seen;
    const re = /import\s+(?:[^'"]*from\s+)?["']([^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src.content)) !== null) {
      const imp = m[1];
      let resolved: string;
      if (imp.startsWith(".")) {
        const base = path.posix.dirname(entry);
        resolved = path.posix.normalize(path.posix.join(base, imp));
      } else {
        resolved = imp;
      }
      if (allInput.sources[resolved]) findDeps(resolved, seen);
    }
    return seen;
  }

  fs.mkdirSync("min-json", { recursive: true });
  for (const t of TARGETS) {
    if (!allInput.sources[t.src]) {
      console.warn(`SKIP ${t.name}: ${t.src} not found in build-info`);
      continue;
    }
    const deps = findDeps(t.src);
    const sources: Record<string, { content: string }> = {};
    for (const d of deps) sources[d] = { content: allInput.sources[d].content };
    const minInput = {
      language: allInput.language,
      sources,
      settings: allInput.settings,
    };
    const out = `min-json/${t.name}.json`;
    fs.writeFileSync(out, JSON.stringify(minInput));
    const sz = fs.statSync(out).size;
    console.log(`${t.name}: ${deps.size} files, ${(sz/1024).toFixed(1)} KB -> ${out}`);
  }
}
main();
