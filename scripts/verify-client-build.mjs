import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GENERATED_FILES = ["api.js", "main.js"];

const tmpDir = mkdtempSync(join(tmpdir(), "habit-client-build-"));
let drift = false;

try {
  execSync(`npx tsc -p tsconfig.client.json --outDir ${tmpDir}`, { stdio: "inherit" });

  for (const file of GENERATED_FILES) {
    const built = readFileSync(join(tmpDir, file), "utf8");
    const committed = readFileSync(join("public", file), "utf8");
    if (built !== committed) {
      console.error(`public/${file} is out of date with src/client/ — run \`npm run build:client\`.`);
      drift = true;
    }
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

if (drift) process.exit(1);
