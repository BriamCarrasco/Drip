#!/bin/sh
set -e

if [ -z "${AUTH_SECRET:-}" ]; then
  SECRET_FILE=/app/data/.auth-secret
  if [ ! -s "$SECRET_FILE" ]; then
    node -e "console.log(require('crypto').randomBytes(33).toString('base64'))" > "$SECRET_FILE"
    chmod 600 "$SECRET_FILE"
    echo "[entrypoint] AUTH_SECRET no definido: se generó uno y se guardó en $SECRET_FILE"
  fi
  AUTH_SECRET="$(cat "$SECRET_FILE")"
  export AUTH_SECRET
fi

exec "$@"
