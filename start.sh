#!/bin/sh
set -e

# 1. Parse Options
CONFIG_PATH="/data/options.json"
if [ -f "$CONFIG_PATH" ]; then
    CFG_DB_URL=$(jq -r '.database_url // empty' $CONFIG_PATH)
    CFG_PORT=$(jq -r '.port // empty' $CONFIG_PATH)
fi

# 2. Prepare Database Path
# Define where we want the DB to live by default
DEFAULT_DB_DIR="/share"
DEFAULT_DB_FILE="$DEFAULT_DB_DIR/inventorybot.db"

# Create the directory if it doesn't exist (Prisma won't create parent folders)
if [ ! -d "$DEFAULT_DB_DIR" ]; then
    echo "Creating database directory at $DEFAULT_DB_DIR..."
    mkdir -p "$DEFAULT_DB_DIR"
fi

# 3. Set Environment Variables
if [ -n "$CFG_DB_URL" ]; then
    export DATABASE_URL="$CFG_DB_URL"
    echo "Using custom DATABASE_URL from config."
else
    # Set the default to your visible config folder
    export DATABASE_URL="file:$DEFAULT_DB_FILE"
    echo "Using default database: $DATABASE_URL"
fi

# Set Port
if [ -n "$CFG_PORT" ]; then
    export PORT="$CFG_PORT"
else
    export PORT=3001
fi

# 4. Run Migrations
cd /app
echo "Running migrations..."
npm run prisma:migrate

# 4. DEBUG: Prove the file exists
echo "--- DEBUG: Checking /share folder ---"
ls -la /share
echo "-------------------------------------"

# 5. Start App
echo "Starting application..."
exec npm start -- -p "$PORT"