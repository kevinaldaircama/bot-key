#!/usr/bin/env bash

#=========================================================
# KEVINTECH MULTI SCRIPT - LICENSE API
#=========================================================

set -o pipefail

LICENSE_API_URL="${LICENSE_API_URL:-}"
LICENSE_API_KEY="${LICENSE_API_KEY:-}"

if [[ -z "$LICENSE_API_URL" ]]; then
    read -r -p "🌐 URL de la API: " LICENSE_API_URL
fi

LICENSE_API_URL="${LICENSE_API_URL%/}"

if [[ -z "$LICENSE_API_KEY" ]]; then
    read -r -s -p "🔐 Clave privada de API: " LICENSE_API_KEY
    echo
fi

read -r -p "🔑 Introduce tu Key: " INSTALL_KEY

INSTALL_KEY="$(printf '%s' "$INSTALL_KEY" | tr -d '[:space:]')"

[[ -n "$INSTALL_KEY" ]] || {
    echo "❌ La Key está vacía."
    exit 1
}

echo
echo "🔐 Verificando licencia..."

BODY="$(mktemp)"

HTTP_CODE="$(
    curl -4 -sS         --connect-timeout 5         --max-time 15         -H "X-License-API-Key: $LICENSE_API_KEY"         -o "$BODY"         -w "%{http_code}"         "$LICENSE_API_URL/api/keys/$INSTALL_KEY"         2>/dev/null || true
)"

if [[ "$HTTP_CODE" != "200" ]]; then
    ERROR="$(jq -r '.error // "api_error"' "$BODY" 2>/dev/null)"
    rm -f "$BODY"
    echo "❌ Licencia rechazada: $ERROR"
    exit 1
fi

KEY_RESPONSE="$(cat "$BODY")"
rm -f "$BODY"

OWNER="$(jq -r '.owner // "Desconocido"' <<<"$KEY_RESPONSE")"
RESELLER="$(jq -r '.reseller // "Desconocido"' <<<"$KEY_RESPONSE")"

IP="$(curl -4 -fsS --connect-timeout 5 --max-time 10 https://api.ipify.org 2>/dev/null || echo "Desconocida")"
HOST="$(hostname)"
OS="$(grep '^PRETTY_NAME=' /etc/os-release | cut -d '"' -f2)"

ACTIVATION_JSON="$(
    jq -n         --arg owner "$OWNER"         --arg reseller "$RESELLER"         --arg token "$INSTALL_KEY"         --arg ip "$IP"         --arg hostname "$HOST"         --arg os "$OS"         --arg date "$(date '+%Y-%m-%d %H:%M:%S')"         '{
            owner:$owner,
            reseller:$reseller,
            token:$token,
            ip:$ip,
            hostname:$hostname,
            os:$os,
            date:$date
        }'
)"

BODY="$(mktemp)"

HTTP_CODE="$(
    curl -4 -sS         --connect-timeout 5         --max-time 15         -X POST         -H "Content-Type: application/json"         -H "X-License-API-Key: $LICENSE_API_KEY"         --data "$ACTIVATION_JSON"         -o "$BODY"         -w "%{http_code}"         "$LICENSE_API_URL/api/activations"         2>/dev/null || true
)"

if [[ "$HTTP_CODE" != "201" ]]; then
    ERROR="$(jq -r '.error // "activation_error"' "$BODY" 2>/dev/null)"
    rm -f "$BODY"
    echo "❌ No se pudo registrar la activación: $ERROR"
    exit 1
fi

rm -f "$BODY"

echo
echo "✅ Licencia válida."
echo "👤 Owner: $OWNER"
echo "👥 Reseller: $RESELLER"
echo "🚀 Activación registrada."
