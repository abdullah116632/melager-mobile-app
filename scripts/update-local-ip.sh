#!/usr/bin/env bash
# Detects this machine's current LAN IP and writes it into mobile/.env.local,
# so EXPO_PUBLIC_API_URL/EXPO_PUBLIC_SOCKET_URL always point at the local
# backend even after switching WiFi networks. Run this after every WiFi
# change, then restart `expo start` (env vars are baked in at bundle time).
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-7000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

# Prefer a real WiFi/ethernet interface over virtual ones (docker, veth,
# virbr, tun/tailscale) that can also carry a global-scope IPv4 address.
IP=$(ip -4 -o addr show scope global 2>/dev/null \
  | awk '{print $2, $4}' \
  | grep -E '^(wlan|wl|eth|en)' \
  | head -n1 \
  | awk '{print $2}' \
  | cut -d/ -f1)

if [ -z "$IP" ]; then
  # Fall back to any global-scope IPv4 address if no wlan/eth/en match.
  IP=$(ip -4 -o addr show scope global 2>/dev/null \
    | awk '{print $4}' | head -n1 | cut -d/ -f1)
fi

if [ -z "$IP" ]; then
  echo "Could not detect a LAN IP. Are you connected to a network?" >&2
  exit 1
fi

cat > "$ENV_FILE" <<EOF
EXPO_PUBLIC_API_URL=http://$IP:$BACKEND_PORT
EXPO_PUBLIC_SOCKET_URL=http://$IP:$BACKEND_PORT
EOF

echo "Updated $ENV_FILE -> $IP:$BACKEND_PORT"
echo "Restart 'expo start' for the change to take effect (env vars are baked in at bundle time)."
