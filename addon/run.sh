#!/bin/sh
set -e

OPTIONS_FILE="/data/options.json"

if [ -f "$OPTIONS_FILE" ]; then
    SNAPCAST_HOST=$(jq -r '.snapcast_host' "$OPTIONS_FILE")
    SNAPCAST_PORT=$(jq -r '.snapcast_port' "$OPTIONS_FILE")
else
    SNAPCAST_HOST="localhost"
    SNAPCAST_PORT="1780"
fi

# Inject Snapcast host into the web app at runtime
cat > /var/www/html/ha-config.js << EOF
window.__HA_SNAPCAST_HOST__ = "${SNAPCAST_HOST}:${SNAPCAST_PORT}";
EOF

# Patch index.html to load ha-config.js before the app scripts
sed -i 's|</head>|<script src="./ha-config.js"></script></head>|' /var/www/html/index.html

exec nginx -g "daemon off;"
