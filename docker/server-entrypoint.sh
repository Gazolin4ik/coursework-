#!/usr/bin/env sh
set -e

# Defaults
: ${DB_HOST:=db}
: ${DB_PORT:=5432}
: ${DB_USER:=postgres}
: ${DB_PASSWORD:=123}
: ${DB_NAME:=coursework_db}

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
for i in $(seq 1 60); do
  if nc -z ${DB_HOST} ${DB_PORT}; then
    echo "PostgreSQL is ready!"
    break
  fi
  echo "Attempt $i/60: PostgreSQL not ready yet..."
  sleep 1
done

if ! nc -z ${DB_HOST} ${DB_PORT}; then
  echo "PostgreSQL is not reachable after 60 attempts" >&2
  exit 1
fi

echo "Applying database schema (idempotent)..."
node setup_database.js || true

echo "Starting server..."
exec node server.js 