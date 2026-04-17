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

# Inject a small script that clears any saved host so the app always connects
# through the nginx proxy (avoids mixed-content WSS→WS issues via HA ingress)
cat > /var/www/html/ha-config.js << EOF
localStorage.removeItem("snapcast_host");
EOF

# Patch index.html to load ha-config.js before the app scripts
sed -i 's|</head>|<script src="./ha-config.js"></script></head>|' /var/www/html/index.html

# Substitute placeholders in nginx config
sed -i "s|__UI_PORT__|${UI_PORT}|g" /etc/nginx/nginx.conf
sed -i "s|SNAPCAST_UPSTREAM|${SNAPCAST_HOST}:${SNAPCAST_PORT}|g" /etc/nginx/nginx.conf

exec nginx -g "daemon off;"
