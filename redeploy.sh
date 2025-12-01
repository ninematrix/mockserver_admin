#!/bin/sh
set -eu

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
CONFIG_DIR="./config"
MERGE_SCRIPT="./merge.sh"
SERVICE_NAME="mockserver"
ADMIN_IMAGE="mockserver_admin-admin"

# -----------------------------------------------------------------------------
# Step 1: Check files
# -----------------------------------------------------------------------------
if [ ! -d "$CONFIG_DIR" ]; then
  echo "❌ ERROR: Directory '$CONFIG_DIR' does not exist."
  exit 1
fi

if [ ! -x "$MERGE_SCRIPT" ]; then
  echo "❌ ERROR: Merge script '$MERGE_SCRIPT' not found or not executable."
  exit 1
fi

echo "▶ Running merge script: $MERGE_SCRIPT"
(
  ./merge.sh
)

echo "✔ Merge completed."

# -----------------------------------------------------------------------------
# Step 2: Rebuild Docker services
# -----------------------------------------------------------------------------
echo "▶ Stopping existing containers..."
docker compose down || true

echo "▶ ReStarting containers..."
docker compose up -d

# -----------------------------------------------------------------------------
# Step 3: Follow logs
# -----------------------------------------------------------------------------
echo "▶ Tailing logs for service '$SERVICE_NAME'..."
docker logs "$SERVICE_NAME" -f
