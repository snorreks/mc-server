# MC Server — Valhelsia 6

A fully automated Minecraft server on GCP, deployed via **Cloud Run** (frontend) + **Firebase Hosting** (CDN), and managed through CLI scripts.

**Live:** https://agmcs2026.web.app/

---

## Requirements

- [Bun](https://bun.sh) (runtime for setup scripts)
- [Docker](https://docker.com) (for building and pushing the frontend container)
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) (authenticated)
- A Google Cloud Platform account (free trial gives $300 credits)

---

## Quick Start

### 1. GCP Setup

Before running the automated setup, you need a GCP project with billing enabled.

```bash
# Login to gcloud
gcloud auth login

# Create a project (or use an existing one)
gcloud projects create YOUR_PROJECT_ID
gcloud config set project YOUR_PROJECT_ID

# Link billing (required for Compute Engine)
# Open https://console.cloud.google.com/billing/linkedaccount?project=YOUR_PROJECT_ID
```

**Important:** Add the Google account you're logged in with on your laptop as:

- **Project Owner** — [IAM & Admin](https://console.cloud.google.com/iam-admin/iam?project=YOUR_PROJECT_ID)
- **Billing Admin** — [Billing](https://console.cloud.google.com/billing) → Account Management → Add member

This allows the billing credit checker and automated setup scripts to work.

### 2. Configure the Project

Edit `config.ts` with your values:

```ts
export const PROJECT_ID = "your-project-id";
// Other values can stay at defaults
```

### 3. Run Automated Setup

```bash
bun run setup
```

This runs the full infrastructure setup in one go:

- **Enables GCP APIs** (Compute Engine, Firebase, Firestore, Storage, etc.)
- **Reserves a static IP** address
- **Creates firewall rules** (Minecraft ports + SSH)
- **Creates the GCE VM** instance with the itzg/minecraft-server Docker image
- **Grants IAM roles** to the Firebase Admin service account
- **Generates SSH key** for triggering backups from the web app
- **Generates Firebase Hosting config** (rewrites to Cloud Run)

During setup, you'll be prompted for:

- **Firebase public config** (from Firebase Console → Project Settings → Web App)
- **Firebase service account JSON** (from Firebase Console → Project Settings → Service Accounts)

These are saved to `frontend/.env`, `scripts/.env`, and `config.ts`.

The setup is idempotent — safe to re-run.

### 4. Deploy

```bash
# Build + deploy frontend to Cloud Run + Firebase Hosting
bun run scripts -- deploy-all
```

This builds the SvelteKit frontend into a Docker container, pushes it to Artifact Registry, deploys to Cloud Run, and updates Firebase Hosting to proxy to Cloud Run.

**What gets deployed:**

| Layer           | Service           | Purpose                         |
| --------------- | ----------------- | ------------------------------- |
| CDN / SSL       | Firebase Hosting  | Global CDN, SSL, custom domain  |
| App server      | Cloud Run         | SvelteKit SSR frontend          |

### 5. Start the Server

```bash
# Check VM status
bun run scripts/src/lib/ops/vm-ssh.ts -- "docker ps"

# Start via web UI at https://agmcs2026.web.app/
```

---

## Architecture

```
┌────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Firebase Hosting  │     │   GCE VM         │     │  Firebase        │
│  (CDN / Proxy)     │     │   (mc-server)    │     │  (Auth/Store)    │
│                    │     │                  │     │                  │
│  All requests      │────▶│  Docker:         │────▶│  Authentication  │
│  proxied to        │     │  itzg/minecraft  │     │  Firestore DB    │
│  Cloud Run         │     │  Forge 1.20.1    │     │  Cloud Storage   │
└────────┬───────────┘     └──────────────────┘     └─────────────────┘
         │                         │
         ▼                         │
┌────────────────────┐              │  RCON (port 25575)
│    Cloud Run        │              │  ◀────────────────
│    (SvelteKit SSR)  │              │  players, server-info
│                     │              │
│  /api/vm            │              │
│  /api/players       │──────────────┘
│  /api/backup        │  SSH (mc-backup)
│                     │  ────────────────▶
│                     │  backup.sh
└─────────────────────┘
```

### VM Operations

| Operation       | Method     | How                                           |
| --------------- | ---------- | --------------------------------------------- |
| Start / Stop    | GCE API    | `compute.instances.start/stop` via googleapis |
| Server status   | RCON       | TCP connection to port 25575                  |
| Players online  | RCON       | `rcon-cli list` via Docker                    |
| Backup          | SSH + RCON | SSH as `mc-backup`, run backup.sh             |
| Modpack install | GCE + SSH  | `gcloud compute ssh` + docker exec            |

---

## JVM Optimization

The Minecraft server runs with these JVM flags for maximum performance:

```
-Xmx12G -Xms12G -XX:+UseZGC -XX:+AlwaysPreTouch -XX:+ZProactive -XX:+DisableExplicitGC
```

| Flag                     | Effect                                       |
| ------------------------ | -------------------------------------------- |
| `-Xmx12G -Xms12G`        | Fixed heap (no resize overhead)              |
| `-XX:+UseZGC`            | Sub-millisecond GC pauses, scales to 16TB    |
| `-XX:+AlwaysPreTouch`    | Pre-allocates all heap RAM at startup        |
| `-XX:+ZProactive`        | Proactive GC cycles for smoother performance |
| `-XX:+DisableExplicitGC` | Prevents mods from triggering full GCs       |

Set in `/mnt/disks/data/user_jvm_args.txt` and `JVM_OPTS` env var on the container.

---

## Client Setup (For Players)

### Requirements

- **Java 17** — Valhelsia 6 / Forge 1.20.1 requires Java 17. Java 21+ will not work.  
  Download: https://adoptium.net/temurin/releases/?version=17

### Installing the Modpack

1. Download and install the [Prism Launcher](https://prismlauncher.org/) or [CurseForge App](https://www.curseforge.com/download/app)
2. Install **Java 17** (linked above) and point your launcher to it
3. Create a new instance from the modpack: **Valhelsia 6** (CurseForge: `https://www.curseforge.com/minecraft/modpacks/valhelsia-6`)
4. In the launcher settings, make sure the Java executable is set to your **Java 17** installation
5. Launch once to generate configs, then close the game
6. Copy the server IP from the web UI and add it as a server in your client
7. Remove the server's `mods/` folder client-side mods listed below (they'll cause conflicts on the server)

### Server IP

Open https://agmcs2026.web.app/ and click **Copy IP** when the server is running.

### Client-Side Mods to Remove

When setting up the modpack, remove these from your local `mods/` folder — they are client-only (the server does not need them):

BadOptimizations, betterbiomereblend, BetterF3, betterfpsdist, blur-forge, cinematiczoom, CraftPresence, CrashAssistant-forge, createbetterfps, drippyloadingscreen_forge, dynamiccrosshair, Ding, EnhancedVisuals_FORGE, enhanced_boss_bars, entityculling-forge, entity_model_features_forge, entity_texture_features_forge, extrasounds, EuphoriaPatcher, fancymenu, gpumemleakfix, ImmediatelyFast-Forge, ItemPhysicLite_FORGE, make_bubbles_pop, melody_forge, oculus-flywheel-compat-Forge, oculus-mc, particle_core, Perception-FORGE, radium-mc, rubidium-extra, ShoulderSurfing-Forge, simplemenu, skinlayers3d-forge, sodiumdynamiclights-forge, sodiumextras-forge, sodiumoptionsapi-forge, visuality-forge, visual_keybinder, YungsMenuTweaks

---

## Scripts Reference

| Script                                               | Purpose                                   |
| ---------------------------------------------------- | ----------------------------------------- |
| `bun run setup`                                      | Full infrastructure setup (includes .env) |
| `bun run scripts -- deploy-all`                      | Build + deploy Cloud Run + Firebase Hosting |
| `bun run scripts -- deploy-all --cloudrun-only`      | Deploy Cloud Run only                     |
| `bun run scripts -- deploy-all --hosting-only`       | Deploy Firebase Hosting only              |
| `bun run scripts/src/lib/setup/backup_ssh.ts`        | Generate/re-generate backup SSH key       |
| `bun run scripts/src/lib/ops/vm-ssh.ts`              | SSH into the VM                           |
| `bun run scripts/src/lib/ops/vm-ssh.ts -- "command"` | Run command on VM                         |
| `bun run scripts/src/lib/ops/vm-setup.ts`            | Upload server icon, backup script, config |
| `bun run scripts/src/lib/ops/vm-restart.ts`          | Restart the Docker container              |
| `bun run scripts/src/lib/ops/vm-install-modpack.ts`  | Install/update modpack on the VM          |

### Environment Files

- `frontend/.env` — secrets for the Cloud Run app (Firebase SA, SSH key)
- `scripts/.env` — secrets for the VM (Minecraft config, modpack URL, SSH key)

Both share the same Firebase service account and backup SSH key.

---

## Manual VM Setup (Alternative)

If you prefer not to use the automated setup, follow the itzg container approach:

```bash
gcloud compute instances create-with-container mc-server \
  --zone=europe-west1-b \
  --machine-type=c3-standard-4 \
  --container-image=itzg/minecraft-server:java17-jdk \
  --container-env-file=scripts/.env \
  --container-mount-host-path=host-path=/mnt/disks/data,mount-path=/data,mode=rw \
  --address=STATIC_IP \
  --tags=minecraft-server
```

---

## Backup Flow

```
User clicks "Start Backup Now"
  → API generates signed GCS upload URL (Firebase Admin SDK)
  → SSHs as mc-backup@VM_IP
  → Runs sudo /mnt/disks/data/mc-backup.sh <signed-url>
    → docker exec rcon-cli save-all
    → tar -czf world* (11MB)
    → curl -X PUT to signed GCS URL
  → Firestore status updated
  → UI shows success + refreshes backup list
```

Backups are stored in Firebase Storage at `backup/YYYY-MM-DD_HH:00.tar.gz`.

---

## License

MIT
