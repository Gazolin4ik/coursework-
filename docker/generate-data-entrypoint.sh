#!/bin/sh
set -e

echo "Waiting for PostgreSQL at db:5432..."
for attempt in $(seq 1 60); do
  if nc -z db 5432; then
    echo "PostgreSQL is ready!"
    break
  fi
  echo "Attempt $attempt/60: PostgreSQL not ready yet..."
  sleep 1
done

if ! nc -z db 5432; then
  echo "PostgreSQL is not reachable after 60 attempts" >&2
  exit 1
fi

echo "Starting data generation..."
node generate_realistic_data.js

