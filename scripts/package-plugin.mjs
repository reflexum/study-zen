import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(rootDir, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const requiredFiles = ["main.js", "manifest.json", "styles.css"];
const releaseDir = join(rootDir, "release");
const packageDir = join(releaseDir, "study-zen");
const zipPath = join(releaseDir, `study-zen-${manifest.version}.zip`);

for (const file of requiredFiles) {
  const source = join(rootDir, file);
  if (!existsSync(source)) {
    throw new Error(`${file} is missing. Run npm run build before npm run package.`);
  }
}

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(packageDir, { recursive: true });

for (const file of requiredFiles) {
  cpSync(join(rootDir, file), join(packageDir, file));
}

if (process.platform === "win32") {
  const quotePowerShell = (value) => `'${value.replaceAll("'", "''")}'`;
  execFileSync(
    "powershell",
    ["-NoProfile", "-Command", `Compress-Archive -Path ${quotePowerShell(join(packageDir, "*"))} -DestinationPath ${quotePowerShell(zipPath)} -Force`],
    { stdio: "inherit" }
  );
} else {
  execFileSync("zip", ["-r", zipPath, "."], { cwd: packageDir, stdio: "inherit" });
}

console.log(`Created ${zipPath}`);
