#!/bin/bash
set -e

CONFIG="config.yml"

if [ ! -f "$CONFIG" ]; then
    echo "Fehler: $CONFIG nicht gefunden." >&2
    exit 1
fi

# Read a key from config.yml (simple key: value format)
get_config() {
    grep -E "^$1:" "$CONFIG" 2>/dev/null | head -1 \
        | sed -E "s/^$1:[[:space:]]*//" | tr -d '"'"'"
}

DOMAIN=$(get_config domain)
DOMAIN=${DOMAIN:-localhost}
PORT=$(get_config port)
PORT=${PORT:-3000}
PASSWORD=$(get_config password)
PASSWORD=${PASSWORD:-changeme}
OMA_PIN=$(get_config oma_pin)
OMA_PIN=${OMA_PIN:-1234}
JWT_SECRET=$(get_config jwt_secret)
JWT_SECRET=${JWT_SECRET:-change-this-to-a-long-random-secret}
USE_CADDY=$(get_config caddy)
USE_CADDY=${USE_CADDY:-false}

# Parse command line flags
COMPOSE_ARGS=()
for arg in "$@"; do
    case "$arg" in
        --caddy)    USE_CADDY=true  ;;
        --no-caddy) USE_CADDY=false ;;
        *)          COMPOSE_ARGS+=("$arg") ;;
    esac
done

# Default compose command if none given
if [ ${#COMPOSE_ARGS[@]} -eq 0 ]; then
    COMPOSE_ARGS=(up -d)
fi

export DOMAIN PORT POST_PASSWORD="$PASSWORD" OMA_PIN JWT_SECRET

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OmaSys"
echo "  Domain : $DOMAIN"
echo "  Port   : $PORT"
echo "  Caddy  : $USE_CADDY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$USE_CADDY" = "true" ]; then
    echo "  Starte mit Caddy (HTTPS automatisch)"
    echo "  OmaGUI : https://$DOMAIN/"
    echo "  PostGUI: https://$DOMAIN/post"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    docker compose --profile caddy "${COMPOSE_ARGS[@]}"
else
    echo "  Starte ohne Caddy (direkter HTTP-Zugriff)"
    echo "  OmaGUI : http://$DOMAIN:$PORT/"
    echo "  PostGUI: http://$DOMAIN:$PORT/post"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    docker compose "${COMPOSE_ARGS[@]}"
fi
