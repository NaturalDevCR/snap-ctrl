#!/bin/sh
set -e

OPTIONS_FILE="/data/options.json"

if [ -f "$OPTIONS_FILE" ]; then
    SNAPCAST_HOST=$(jq -r '.snapcast_host' "$OPTIONS_FILE")
    SNAPCAST_PORT=$(jq -r '.snapcast_port' "$OPTIONS_FILE")
    UI_PORT=$(jq -r '.ui_port' "$OPTIONS_FILE")
else
    SNAPCAST_HOST="localhost"
    SNAPCAST_PORT="1780"
    UI_PORT="8099"
fi

# Generate ha-config.js — loaded by index.html at build time (injected via vite.config.ha.ts).
# Sets the proxy host so the app never connects directly to Snapcast (avoids WSS→WS mixed content).
# Also exposes the real Snapcast address as __HA_SNAPCAST_INFO__ for read-only display in the UI.
cat > /var/www/html/ha-config.js << 'HAEOF'
(function () {
  try { localStorage.removeItem("snapcast_host"); } catch (e) {}
  window.__HA_SNAPCAST_HOST__ = true;
HAEOF

echo "  window.__HA_SNAPCAST_INFO__ = \"${SNAPCAST_HOST}:${SNAPCAST_PORT}\";" >> /var/www/html/ha-config.js
echo "})();" >> /var/www/html/ha-config.js

# Substitute placeholders in nginx config
sed -i "s|__UI_PORT__|${UI_PORT}|g" /etc/nginx/nginx.conf
sed -i "s|SNAPCAST_UPSTREAM|${SNAPCAST_HOST}:${SNAPCAST_PORT}|g" /etc/nginx/nginx.conf

exec nginx -g "daemon off;"
