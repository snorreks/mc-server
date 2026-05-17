# MC Server — Beyond Depth Modpack

A fully automated Minecraft server on GCP, deployed via **Netlify** (frontend) and managed through CLI scripts.

**Live:** https://agmcs.netlify.app/

---

## Requirements

- [Bun](https://bun.sh) (runtime for setup scripts)
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

**Important:** Add `snorre@mailvideo.com` as:

- **Project Owner** — [IAM & Admin](https://console.cloud.google.com/iam-admin/iam?project=YOUR_PROJECT_ID)
- **Billing Admin** — [Billing](https://console.cloud.google.com/billing) → Account Management → Add member

This allows the billing credit checker to work.

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

This runs the full infrastructure setup:

- Enables GCP APIs (Compute Engine, Firebase, Firestore, Storage, etc.)
- Reserves a static IP address
- Creates firewall rules (Minecraft ports + SSH)
- Creates the GCE VM instance with the itzg/minecraft-server Docker image
- Grants IAM roles to the Firebase Admin service account
- **Generates SSH key** for triggering backups from the web app
- Installs the backup script on the VM

The setup is idempotent — safe to re-run.

### 4. Set Up Secrets

```bash
bun run scripts/src/lib/setup/env.ts
```

This prompts for:

- **Firebase public config** (from Firebase Console → Project Settings → Web App)
- **Firebase service account JSON** (from Firebase Console → Project Settings → Service Accounts)

These are saved to `frontend/.env` and `scripts/.env`.

### 5. Deploy to Netlify

The frontend deploys to Netlify. Connect your repo or use the CLI:

```bash
cd frontend
npm run build
npx netlify deploy --prod
```

**Netlify persists across projects** — if you switch GCP projects, just update the service account environment variable on Netlify:

- `FIREBASE_SERVICE_ACCOUNT` — the Firebase Admin service account JSON
- `BACKUP_SSH_KEY` — the SSH private key for triggering backups (base64-encoded PEM)

### 6. Start the Server

```bash
# Check VM status
bun run scripts/src/lib/ops/vm-ssh.ts -- "docker ps"

# Start via web UI at https://agmcs.netlify.app/
```

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Netlify       │     │   GCE VM         │     │  Firebase        │
│   (Frontend)    │────▶│   (mc-server)    │────▶│  (Auth/Store)    │
│                 │     │                  │     │                  │
│  /api/vm        │     │  Docker:         │     │  Authentication  │
│  /api/players   │     │  itzg/minecraft  │     │  Firestore DB    │
│  /api/backup    │     │  Forge 1.20.1    │     │  Cloud Storage   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │
        │  SSH (mc-backup)      │  RCON (port 25575)
        │  ────────────────▶    │  ◀────────────────
        │  backup.sh            │  players, server-info
        └───────────────────────┘
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
-Xmx13G -Xms13G -XX:+UseZGC -XX:+AlwaysPreTouch -XX:+ZProactive -XX:+DisableExplicitGC
```

| Flag                     | Effect                                       |
| ------------------------ | -------------------------------------------- |
| `-Xmx13G -Xms13G`        | Fixed heap (no resize overhead)              |
| `-XX:+UseZGC`            | Sub-millisecond GC pauses, scales to 16TB    |
| `-XX:+AlwaysPreTouch`    | Pre-allocates all heap RAM at startup        |
| `-XX:+ZProactive`        | Proactive GC cycles for smoother performance |
| `-XX:+DisableExplicitGC` | Prevents mods from triggering full GCs       |

Set in `/mnt/disks/data/user_jvm_args.txt` and `JVM_OPTS` env var on the container.

---

## Client-Side Mods

When setting up the modpack, remove these mods from the server's `mods/` folder — they are client-only:

BadOptimizations, betterbiomereblend, BetterF3, betterfpsdist, blur-forge, cinematiczoom, CraftPresence, CrashAssistant-forge, createbetterfps, drippyloadingscreen_forge, dynamiccrosshair, Ding, EnhancedVisuals_FORGE, enhanced_boss_bars, entityculling-forge, entity_model_features_forge, entity_texture_features_forge, extrasounds, EuphoriaPatcher, fancymenu, gpumemleakfix, ImmediatelyFast-Forge, ItemPhysicLite_FORGE, make_bubbles_pop, melody_forge, oculus-flywheel-compat-Forge, oculus-mc, particle_core, Perception-FORGE, radium-mc, rubidium-extra, ShoulderSurfing-Forge, simplemenu, skinlayers3d-forge, sodiumdynamiclights-forge, sodiumextras-forge, sodiumoptionsapi-forge, visuality-forge, visual_keybinder, YungsMenuTweaks

---

## Scripts Reference

| Script                                               | Purpose                                   |
| ---------------------------------------------------- | ----------------------------------------- |
| `bun run setup`                                      | Full infrastructure setup                 |
| `bun run scripts/src/lib/setup/backup_ssh.ts`        | Generate/re-generate backup SSH key       |
| `bun run scripts/src/lib/ops/vm-ssh.ts`              | SSH into the VM                           |
| `bun run scripts/src/lib/ops/vm-ssh.ts -- "command"` | Run command on VM                         |
| `bun run scripts/src/lib/ops/vm-setup.ts`            | Upload server icon, backup script, config |
| `bun run scripts/src/lib/ops/vm-restart.ts`          | Restart the Docker container              |

### Environment Files

- `frontend/.env` — secrets for the Netlify app (Firebase SA, SSH key)
- `scripts/.env` — secrets for the VM (Minecraft config, modpack URL, SSH key)

Both share the same Firebase service account and backup SSH key.

---

## Manual VM Setup (Alternative)

If you prefer not to use the automated setup, follow the itzg container approach:

```bash
gcloud compute instances create-with-container mc-server \
  --zone=europe-west1-b \
  --machine-type=n2-highmem-2 \
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
