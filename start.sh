#!/bin/bash
set -e

echo "=== Starting Next.js Server ==="
echo "PORT environment variable: ${PORT:-not set (using default 3000)}"
echo "Starting server on: 0.0.0.0:${PORT:-3000}"

# 에러 핸들링
trap 'echo "Received signal, shutting down..."; exit 0' SIGTERM SIGINT

# Next.js 시작
exec next start -H 0.0.0.0 -p ${PORT:-3000}

