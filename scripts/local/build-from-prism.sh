#!/usr/bin/env bash
set -euo pipefail
# scripts/local/build-from-prism.sh
# Builds a server-ready zip from a Prism Launcher instance.

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTANCE="$HOME/.local/share/PrismLauncher/instances/Beyond Depth"
WORK="$ROOT/scripts/.local-data/server-pack"
ZIP_OUT="$ROOT/scripts/.local-data/beyond-depth-server.zip"

echo "=== Building server pack from Prism instance ==="

# Clean start
rm -rf "$WORK"
mkdir -p "$WORK/server"

# 1. Forge server install
FORGE_URL="https://maven.minecraftforge.net/net/minecraftforge/forge/1.20.1-47.4.20/forge-1.20.1-47.4.20-installer.jar"
if [ ! -f /tmp/forge-installer.jar ]; then
  echo "Downloading Forge..."
  curl -sLo /tmp/forge-installer.jar "$FORGE_URL"
fi

JAVA17="/nix/store/mfg02prkjhwv8z6z36b953h8k34dcfwc-openjdk-17.0.18+8/bin/java"
echo "Installing Forge server..."
$JAVA17 -jar /tmp/forge-installer.jar --installServer "$WORK/server" > /dev/null 2>&1
echo "Forge installed"

# 2. Copy files from Prism instance
echo "Copying files from Prism instance..."
MC="$INSTANCE/minecraft"

# Copy mods
cp -r "$MC/mods" "$WORK/server/"
echo "  Mods: $(ls "$WORK/server/mods"/*.jar | wc -l)"

# Copy config
[ -d "$MC/config" ] && cp -r "$MC/config" "$WORK/server/"
echo "  Config copied"

# Copy kubejs
[ -d "$MC/kubejs" ] && cp -r "$MC/kubejs" "$WORK/server/"
echo "  KubeJS copied"

# Copy defaultconfigs
[ -d "$MC/defaultconfigs" ] && cp -r "$MC/defaultconfigs" "$WORK/server/"
echo "  Defaultconfigs copied"

# Copy scripts if present
[ -d "$MC/scripts" ] && cp -r "$MC/scripts" "$WORK/server/"

# 3. Remove client-side mods
echo ""
echo "Removing client-side mods..."
CLIENT_MODS=(
  BadOptimizations betterbiomereblend BetterF3 betterfpsdist
  blur-forge cinematiczoom CraftPresence CrashAssistant-forge
  createbetterfps drippyloadingscreen_forge dynamiccrosshair Ding
  EnhancedVisuals_FORGE enhanced_boss_bars entityculling-forge
  entity_model_features_forge entity_texture_features_forge extrasounds
  EuphoriaPatcher fancymenu gpumemleakfix ImmediatelyFast-Forge
  ItemPhysicLite_FORGE make_bubbles_pop melody_forge
  oculus-flywheel-compat-Forge oculus-mc particle_core
  Perception-FORGE radium-mc rubidium-extra ShoulderSurfing-Forge
  simplemenu skinlayers3d-forge sodiumdynamiclights-forge
  sodiumextras-forge sodiumoptionsapi-forge visuality-forge
  visual_keybinder YungsMenuTweaks
)

REMOVED=0
for pattern in "${CLIENT_MODS[@]}"; do
  for f in "$WORK/server/mods/"*"$pattern"*; do
    if [ -f "$f" ]; then
      rm "$f"
      REMOVED=$((REMOVED + 1))
      echo "  Removed: $(basename "$f")"
    fi
  done
done
echo "Removed $REMOVED client-side mods"

# 4. Configure server.properties
echo ""
echo "Configuring server.properties..."
PROPS="$WORK/server/server.properties"

# Make sure server.properties exists
echo "Generating server.properties..."
cat > "$PROPS" << 'EOF'
allow-flight=true
max-tick-time=-1
view-distance=12
difficulty=normal
max-players=20
gamemode=survival
enable-rcon=true
rcon.password=minecraft
rcon.port=25575
broadcast-rcon-to-ops=true
server-port=25565
motd=A Beyond Depth Server
level-type=default
enable-query=false
enable-status=true
spawn-protection=0
pvp=true
white-list=true
EOF

echo "Server properties written"

# 5. EULA
echo "eula=true" > "$WORK/server/eula.txt"

# 6. Final mod count
MOD_COUNT=$(ls "$WORK/server/mods/"*.jar 2>/dev/null | wc -l)
echo ""
echo "=== Final mod count: $MOD_COUNT ==="

# 7. Zip
echo ""
echo "Creating zip..."
cd "$WORK/server"
zip -r "$ZIP_OUT" . -x "*.log" "logs/*" "cache/*" > /dev/null 2>&1
echo "Created: $ZIP_OUT"
echo "Size: $(du -h "$ZIP_OUT" | cut -f1)"
