#!/usr/bin/env bash
set -euo pipefail
# scripts/local/build-server-pack.sh
# Downloads Beyond Depth modpack, sets up Forge server, removes client mods,
# applies config, and creates a ready-to-upload zip.

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$ROOT/scripts/.local-data/server-pack"
ZIP_OUT="$ROOT/scripts/.local-data/beyond-depth-server.zip"

echo "=== Beyond Depth Server Pack Builder ==="
echo "Work dir: $WORK"

# Clean start
rm -rf "$WORK"
mkdir -p "$WORK/server"
cd "$WORK"

# 1. Download modpack
echo "=== Downloading modpack ==="
curl -sLo modpack.zip "https://mediafilez.forgecdn.net/files/8070/311/Beyond%20Depth-Ver12.5.2.zip"
unzip -q modpack.zip -d modpack
echo "Extracted modpack"

# 2. Download Forge 47.4.20 installer
echo "=== Downloading Forge 47.4.20 ==="
FORGE_URL="https://maven.minecraftforge.net/net/minecraftforge/forge/1.20.1-47.4.20/forge-1.20.1-47.4.20-installer.jar"
curl -sLo forge-installer.jar "$FORGE_URL"

# 3. Run Forge installer (headless, install server)
echo "=== Installing Forge server ==="
java -jar forge-installer.jar --installServer "$WORK/server"
echo "Forge installed"

# 4. Copy modpack files to server
echo "=== Copying modpack files ==="
# Determine modpack root (might be in a subfolder)
MP_ROOT="$WORK/modpack"
if [ "$(ls "$MP_ROOT" | wc -l)" = 1 ] && [ -d "$MP_ROOT/$(ls "$MP_ROOT")" ]; then
  MP_ROOT="$MP_ROOT/$(ls "$MP_ROOT")"
fi

# Copy folders
for dir in mods config kubejs defaultconfigs scripts; do
  if [ -d "$MP_ROOT/$dir" ]; then
    cp -r "$MP_ROOT/$dir" "$WORK/server/"
    echo "  Copied $dir"
  fi
done

# Copy overrides if present
if [ -d "$MP_ROOT/overrides" ]; then
  cp -r "$MP_ROOT/overrides/"* "$WORK/server/" 2>/dev/null || true
  echo "  Copied overrides"
fi

# 5. Remove client-side mods
echo "=== Removing client-side mods ==="
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

# 6. Configure server.properties
echo "=== Configuring server.properties ==="
PROPS="$WORK/server/server.properties"

# Enable flight
if grep -q '^allow-flight=' "$PROPS" 2>/dev/null; then
  sed -i 's/^allow-flight=.*/allow-flight=true/' "$PROPS"
else
  echo 'allow-flight=true' >> "$PROPS"
fi

# Disable max tick time (-1 disables)
if grep -q '^max-tick-time=' "$PROPS" 2>/dev/null; then
  sed -i 's/^max-tick-time=.*/max-tick-time=-1/' "$PROPS"
else
  echo 'max-tick-time=-1' >> "$PROPS"
fi

# Set view distance
if grep -q '^view-distance=' "$PROPS" 2>/dev/null; then
  sed -i 's/^view-distance=.*/view-distance=12/' "$PROPS"
else
  echo 'view-distance=12' >> "$PROPS"
fi

# EULA
echo 'eula=true' > "$WORK/server/eula.txt"

echo "Server properties configured"

# 7. Count mods
MOD_COUNT=$(ls "$WORK/server/mods/"*.jar 2>/dev/null | wc -l)
echo "=== Mod count: $MOD_COUNT ==="

# 8. Zip it
echo "=== Creating zip ==="
cd "$WORK/server"
zip -r "$ZIP_OUT" . -x "*.log" "logs/*" "cache/*" > /dev/null
echo "Server pack created: $ZIP_OUT"
echo "Size: $(du -h "$ZIP_OUT" | cut -f1)"
