#!/usr/bin/env bun
/**
 * scripts/src/lib/ops/vm-install-modpack.ts
 *
 * Installs a CurseForge modpack by processing manifest.json inside the container.
 * Uses Python (stdlib only — no pip needed) for parallel mod downloads.
 *
 * Usage:
 *   bun run scripts/src/lib/ops/vm-install-modpack.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmt, run } from '../cli_utils';
import { PROJECT_ID, VM_INSTANCE, VM_ZONE } from '../deployment_config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../');

// Client-side mods to remove (from the modpack's server guide)
const CLIENT_MODS = [
  'badoptimizations',
  'betterbiomereblend',
  'betterf3',
  'betterfpsdist',
  'blur-forge',
  'cinematiczoom',
  'craftpresence',
  'crashassistant-forge',
  'createbetterfps',
  'drippyloadingscreen',
  'dynamiccrosshair',
  'ding',
  'enhancedvisuals',
  'enhanced_boss_bars',
  'entityculling-forge',
  'entity_model_features',
  'entity_texture_features',
  'extrasounds',
  'euphoriapatcher',
  'fancymenu',
  'gpumemleakfix',
  'immediatelyfast-forge',
  'itemphysiclite',
  'make_bubbles_pop',
  'melody_forge',
  'oculus-flywheel-compat',
  'oculus-mc',
  'particle_core',
  'perception-forge',
  'radium-mc',
  'rubidium-extra',
  'shouldersurfing-forge',
  'simplemenu',
  'skinlayers3d-forge',
  'sodiumdynamiclights',
  'sodiumextras',
  'sodiumoptionsapi',
  'visuality-forge',
  'visual_keybinder',
  'yungsmenutweaks',
];

function genPythonInstaller(apiKey: string): string {
  return `
import json, os, urllib.request, urllib.error, shutil, time, sys
from concurrent.futures import ThreadPoolExecutor, as_completed

API_KEY = ${JSON.stringify(apiKey)}
MODPACK_URL = "https://edge.forgecdn.net/files/8070/311/Beyond%20Depth-Ver12.5.2.zip"
DATA_DIR = "/data"
TMP_DIR = "/tmp/bd-install"
os.makedirs(TMP_DIR, exist_ok=True)

def log(msg):
    print(f"[bd-install] {msg}", flush=True)

# 1. Download and extract modpack
log("Downloading modpack...")
urllib.request.urlretrieve(MODPACK_URL, f"{TMP_DIR}/modpack.zip")
shutil.unpack_archive(f"{TMP_DIR}/modpack.zip", TMP_DIR)
log("Extracted modpack")

# 2. Read manifest
with open(f"{TMP_DIR}/manifest.json") as f:
    manifest = json.load(f)

files = manifest["files"]
forge_ver = manifest["minecraft"]["modLoaders"][0]["id"]
log(f"Mods: {len(files)}, Forge: {forge_ver}")

# 3. Download each mod
mods_dir = f"{DATA_DIR}/mods"
os.makedirs(mods_dir, exist_ok=True)

headers = {
    "Accept": "application/json",
    "x-api-key": API_KEY,
}

def download_mod(entry):
    pid, fid = entry["projectID"], entry["fileID"]
    try:
        url = f"https://api.curseforge.com/v1/mods/{pid}/files/{fid}/download-url"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as r:
            dl_url = json.loads(r.read().decode())["data"]
        # Use the original filename from the download URL
        fname = dl_url.rsplit("/", 1)[-1].split("?")[0]
        if not fname.endswith(".jar"):
            fname = f"mod_{pid}_{fid}.jar"
        out = f"{mods_dir}/{fname}"
        if os.path.exists(out) and os.path.getsize(out) > 1000:
            return f"SKIP {fname} (exists)"
        urllib.request.urlretrieve(dl_url, out)
        return f"OK {fname}"
    except Exception as e:
        return f"FAIL {pid}/{fid}: {e}"

log("Downloading mods (this will take a while)...")
with ThreadPoolExecutor(max_workers=8) as pool:
    futures = {pool.submit(download_mod, f): f for f in files}
    done, fail = 0, 0
    for i, fut in enumerate(as_completed(futures), 1):
        r = fut.result()
        if r.startswith("OK"): done += 1
        elif r.startswith("FAIL"): fail += 1
        if i % 50 == 0 or r.startswith("FAIL"):
            log(f"[{i}/{len(files)}] OK={done} FAIL={fail}")

log(f"Done: {done} OK, {fail} failed")
log(f"Total mods: {len(os.listdir(mods_dir))}")

# 4. Apply overrides
overrides = f"{TMP_DIR}/overrides"
if os.path.exists(overrides):
    for root, dirs, files in os.walk(overrides):
        rel = os.path.relpath(root, overrides)
        dst = f"{DATA_DIR}/{rel}"
        os.makedirs(dst, exist_ok=True)
        for f in files:
            shutil.copy2(os.path.join(root, f), os.path.join(dst, f))
    log("Overrides applied")

# 5. Remove client-side mods
removed = 0
exclude = ${JSON.stringify(CLIENT_MODS)}
for f in os.listdir(mods_dir):
    for pattern in exclude:
        if pattern.lower() in f.lower():
            os.remove(os.path.join(mods_dir, f))
            removed += 1
            break
log(f"Removed {removed} client-side mods")

# 6. Fix permissions
import subprocess
for d in ["config", "mods", "defaultconfigs", "kubejs"]:
    p = os.path.join(DATA_DIR, d)
    if os.path.exists(p):
        subprocess.run(["chown", "-R", "minecraft:minecraft", p], capture_output=True)
log("Permissions fixed")

log("Installation complete!")
`.trim();
}

async function main() {
  console.log(fmt.head('Installing Beyond Depth modpack'));

  // Read API key
  const envContent = readFileSync(resolve(ROOT, 'scripts/.env'), 'utf-8');
  const apiKey = envContent.match(/CF_API_KEY=(.+)/)?.[1]?.trim();
  if (!apiKey) {
    console.error(fmt.err('CF_API_KEY not found in scripts/.env'));
    process.exit(1);
  }

  // Generate Python installer
  const pyScript = genPythonInstaller(apiKey);
  const pyPath = '/tmp/bd-install.py';
  writeFileSync(pyPath, pyScript);

  // Upload to VM and copy into container
  console.log(fmt.section('Upload installer'));
  const { code: scpCode } = await run([
    'gcloud',
    'compute',
    'scp',
    pyPath,
    `${VM_INSTANCE}:/tmp/bd-install.py`,
    `--zone=${VM_ZONE}`,
    `--project=${PROJECT_ID}`,
    '--quiet',
  ]);
  if (scpCode !== 0) {
    console.error(fmt.err('Upload failed'));
    process.exit(1);
  }
  await run([
    'gcloud',
    'compute',
    'ssh',
    VM_INSTANCE,
    `--zone=${VM_ZONE}`,
    `--project=${PROJECT_ID}`,
    `--command=sudo cp /tmp/bd-install.py /mnt/disks/data/bd-install.py`,
    '--quiet',
  ]);

  // Copy into container and run
  const containerCopy = `docker cp /mnt/disks/data/bd-install.py $(docker ps -q):/tmp/bd-install.py`;
  await run([
    'gcloud',
    'compute',
    'ssh',
    VM_INSTANCE,
    `--zone=${VM_ZONE}`,
    `--project=${PROJECT_ID}`,
    `--command=${containerCopy}`,
    '--quiet',
  ]);

  console.log(fmt.section('Installing mods (527 mods...)'));
  const { out, code } = await run([
    'gcloud',
    'compute',
    'ssh',
    VM_INSTANCE,
    `--zone=${VM_ZONE}`,
    `--project=${PROJECT_ID}`,
    `--command=docker exec $(docker ps -q) python3 /tmp/bd-install.py 2>&1 | tail -20`,
    '--quiet',
  ]);

  console.log(out);

  if (code !== 0) {
    console.error(fmt.err('Installation had errors'));
    process.exit(1);
  }

  console.log(fmt.ok('Modpack installed! Restarting container...'));
  await run([
    'gcloud',
    'compute',
    'ssh',
    VM_INSTANCE,
    `--zone=${VM_ZONE}`,
    `--project=${PROJECT_ID}`,
    `--command=docker restart $(docker ps -q)`,
    '--quiet',
  ]);
  console.log(fmt.ok('Container restarted — loading mods...'));
}

await main();
