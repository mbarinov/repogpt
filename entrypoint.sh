#!/bin/sh

# Define the path to the initialization marker file
INIT_MARKER="/app/db_initialized.marker"

# Check if the database has already been initialized
if [ ! -f "$INIT_MARKER" ]; then
  echo "Initializing the database with Prisma..."
  npx prisma db push  # Apply schema changes only if not already initialized

  # Create the marker file to indicate initialization has completed
  touch "$INIT_MARKER"
  echo "Database initialized successfully."
else
  echo "Database already initialized. Skipping schema push."
fi
