#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/kevintech-bot"
SERVICE="kevintech-bot"

if [[ "$EUID" -ne 0 ]]; then
    echo "❌ Ejecuta como root."
    exit 1
fi

if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js no está instalado."
    echo "Instala Node.js 20+ y vuelve a ejecutar."
    exit 1
fi

mkdir -p "$APP_DIR"
cp -a ./. "$APP_DIR/"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
    cp .env.example .env
    echo "❌ Se creó $APP_DIR/.env"
    echo "Configura BOT_TOKEN, OWNER_ID y LICENSE_API_KEY."
    exit 1
fi

if grep -q 'CAMBIA_ESTA_CLAVE' .env; then
    echo "❌ Cambia LICENSE_API_KEY en $APP_DIR/.env"
    echo "Puedes generar una con:"
    echo "openssl rand -hex 32"
    exit 1
fi

npm install --omit=dev

install -m 644     systemd/kevintech-bot.service     "/etc/systemd/system/$SERVICE.service"

systemctl daemon-reload
systemctl enable "$SERVICE"
systemctl restart "$SERVICE"

echo
echo "=============================================="
echo "✅ KevinTech Bot instalado correctamente"
echo "=============================================="
echo
echo "🗄️ SQLite:"
echo "   $APP_DIR/data/bot.db"
echo
echo "🔐 API local:"
echo "   http://127.0.0.1:8787"
echo
echo "⚙️ Servicio:"
echo "   $SERVICE"
echo
echo "Estado:"
systemctl --no-pager --full status "$SERVICE" || true
echo
echo "Logs:"
echo "journalctl -u $SERVICE -f"
