#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting Rescope Surveys API..."
exec node src/index.js
