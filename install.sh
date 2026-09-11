#!/bin/bash

# ============================================================
#       KEVINTECH MULTI SCRIPT VPN BOT INSTALLER v5.1
# ============================================================
# SQLite • Multi Owner • Licencias • Cloudflare • PM2
# SIN FIREBASE
# ============================================================

set -o pipefail

# ============================================================
# CONFIGURACIÓN
# ============================================================

BOT_NAME="Multi Script VPN Bot"

# Repositorio oficial del proyecto (no se solicita al usuario)
DEFAULT_REPO="https://github.com/kevinaldaircama/bot-key.git"

INSTALL_DIR="/opt/multi-script-bot"
CONFIG_DIR="/etc/kevintech/multiscript"

BACKUP_DIR="$CONFIG_DIR/backups"
LOG_DIR="$CONFIG_DIR/logs"

ENV_FILE="$INSTALL_DIR/.env"
OWNERS_FILE="$CONFIG_DIR/owners.json"

DB_DIR="$INSTALL_DIR/data"
DB_FILE="$DB_DIR/bot.db"

INSTALL_LOG="$LOG_DIR/installer.log"

PM2_NAME="multiscriptbot"
NODE_VERSION="22"

# Dominio público de la License API. Solo se solicita en una instalación nueva.
API_DOMAIN_FILE="$CONFIG_DIR/api-domain"
NGINX_SITE="/etc/nginx/sites-available/kevintech-license-api"
NGINX_LINK="/etc/nginx/sites-enabled/kevintech-license-api"

LOG_DAYS="${LOG_DAYS:-7}"
BACKUP_COUNT="${BACKUP_COUNT:-30}"

SILENT="${SILENT:-0}"

# ============================================================
# COLORES
# ============================================================

RESET="\033[0m"
BOLD="\033[1m"

RED="\033[1;31m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
BLUE="\033[1;34m"
MAGENTA="\033[1;35m"
CYAN="\033[1;36m"
WHITE="\033[1;37m"

# ============================================================
# LOG
# ============================================================

log() {
    mkdir -p "$LOG_DIR"

    printf '[%s] %s\n' \
        "$(date '+%Y-%m-%d %H:%M:%S')" \
        "$*" >> "$INSTALL_LOG"
}

info() {
    log "$*"

    [[ "$SILENT" == "1" ]] && return

    echo -e "${BLUE}[•]${RESET} $*"
}

success() {
    log "$*"

    [[ "$SILENT" == "1" ]] && return

    echo -e "${GREEN}[✓]${RESET} $*"
}

warning() {
    log "WARNING: $*"

    [[ "$SILENT" == "1" ]] && return

    echo -e "${YELLOW}[!]${RESET} $*"
}

error() {
    log "ERROR: $*"

    echo -e "${RED}[✗]${RESET} $*" >&2
}

die() {
    error "$*"
    exit 1
}

# ============================================================
# BANNER
# ============================================================

banner() {

    [[ "$SILENT" == "1" ]] && return

    clear

    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║                 KEVINTECH MULTI SCRIPT BOT                  ║"
    echo "║                         INSTALLER v5.1                       ║"
    echo "║                                                              ║"
    echo "║       SQLITE • MULTI OWNER • LICENSE • CLOUDFLARE • PM2     ║"
    echo "║                                                              ║"
    echo "║              🔒 SIN FIREBASE • 🗄️ SQLITE FIRST              ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${RESET}"
}

section() {

    [[ "$SILENT" == "1" ]] && return

    echo
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${WHITE} $* ${RESET}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo
}

pause() {

    [[ "$SILENT" == "1" ]] && return

    read -r -p "Presiona ENTER para continuar..."
}

# ============================================================
# ROOT
# ============================================================

check_root() {

    if [[ "$EUID" -ne 0 ]]; then
        die "Este instalador debe ejecutarse como root."
    fi
}

# ============================================================
# SISTEMA
# ============================================================

check_os() {

    [[ -f /etc/os-release ]] ||
        die "No se encontró /etc/os-release."

    # shellcheck disable=SC1091
    source /etc/os-release

    [[ "$ID" == "ubuntu" ]] ||
        die "Solo Ubuntu es compatible."

    case "$VERSION_ID" in

        20.04|22.04|24.04)
            success "Ubuntu $VERSION_ID detectado."
            ;;

        *)
            die "Ubuntu $VERSION_ID no está soportado."
            ;;

    esac
}

# ============================================================
# DIRECTORIOS
# ============================================================

create_directories() {

    mkdir -p "$CONFIG_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$DB_DIR"

    touch "$INSTALL_LOG"

    chmod 700 "$CONFIG_DIR"
    chmod 700 "$BACKUP_DIR"
    chmod 700 "$LOG_DIR"

    chmod 600 "$INSTALL_LOG"

    if [[ -f "$OWNERS_FILE" ]]; then
        chmod 600 "$OWNERS_FILE"
    fi

    if [[ -f "$DB_FILE" ]]; then
        chmod 600 "$DB_FILE"
    fi
}

# ============================================================
# COMANDOS
# ============================================================

require_command() {

    command -v "$1" >/dev/null 2>&1 ||
        die "No se encontró el comando: $1"
}

# ============================================================
# LIMPIEZA DE LOGS
# ============================================================

clean_old_logs() {

    info "Limpiando logs con más de $LOG_DAYS días..."

    if [[ -d "$LOG_DIR" ]]; then

        find "$LOG_DIR" \
            -type f \
            -mtime +"$LOG_DAYS" \
            -delete 2>/dev/null || true

    fi

    if [[ -d "/root/.pm2/logs" ]]; then

        find "/root/.pm2/logs" \
            -type f \
            -mtime +"$LOG_DAYS" \
            -delete 2>/dev/null || true

    fi

    success "Limpieza de logs completada."
}

# ============================================================
# PAQUETES
# ============================================================

install_packages() {

    export DEBIAN_FRONTEND=noninteractive

    info "Actualizando repositorios..."

    apt-get update -y >/dev/null 2>&1 ||
        die "Error ejecutando apt update."

    info "Instalando dependencias..."

    apt-get install -y \
        curl \
        wget \
        git \
        nano \
        unzip \
        zip \
        jq \
        sqlite3 \
        openssl \
        ca-certificates \
        nginx \
        certbot \
        python3-certbot-nginx \
        gnupg \
        build-essential \
        >/dev/null 2>&1 ||
        die "Error instalando dependencias."

    success "Dependencias instaladas."
}

# ============================================================
# NODE.JS
# ============================================================

install_node() {

    local current=""

    if command -v node >/dev/null 2>&1; then

        current="$(
            node -v |
            sed 's/^v//' |
            cut -d. -f1
        )"

        if [[ "$current" =~ ^[0-9]+$ ]] &&
           (( current >= NODE_VERSION )); then

            success "Node.js $(node -v) ya está instalado."
            return

        fi
    fi

    info "Instalando Node.js $NODE_VERSION..."

    curl -fsSL \
        "https://deb.nodesource.com/setup_${NODE_VERSION}.x" |
        bash - >/dev/null 2>&1 ||
        die "No se pudo configurar Node.js."

    apt-get install -y nodejs >/dev/null 2>&1 ||
        die "No se pudo instalar Node.js."

    success "Node.js $(node -v) instalado."
    success "NPM $(npm -v) instalado."
}

# ============================================================
# PM2
# ============================================================

install_pm2() {

    if command -v pm2 >/dev/null 2>&1; then

        success "PM2 $(pm2 -v 2>/dev/null | head -n1) ya está instalado."
        return

    fi

    info "Instalando PM2..."

    npm install -g pm2 >/dev/null 2>&1 ||
        die "No se pudo instalar PM2."

    success "PM2 instalado."
}

# ============================================================
# INPUT SEGURO
# ============================================================

read_secret() {

    local prompt="$1"
    local value=""

    # Leer directamente del terminal. No usar command substitution para
    # evitar que algunos terminales/SSH pierdan el valor pegado.
    if [[ -t 0 ]]; then
        read -r -s -p "$prompt: " value </dev/tty
        printf '\n' >/dev/tty
    else
        read -r -s -p "$prompt: " value
        printf '\n'
    fi

    # Quitar espacios accidentales al principio/final del valor pegado.
    value="${value#${value%%[![:space:]]*}}"
    value="${value%${value##*[![:space:]]}}"

    REPLY_SECRET="$value"
}

# ============================================================
# GENERAR LICENSE API KEY
# ============================================================

generate_license_key() {

    local key=""

    if command -v openssl >/dev/null 2>&1; then

        key="$(openssl rand -hex 32 2>/dev/null || true)"

    fi

    if [[ ${#key} -lt 32 ]]; then

        key="$(
            head -c 64 /dev/urandom |
            base64 |
            tr -dc 'A-Za-z0-9' |
            head -c 64
        )"

    fi

    [[ ${#key} -ge 32 ]] ||
        die "No se pudo generar LICENSE_API_KEY."

    printf '%s' "$key"
}

# ============================================================
# OBTENER LICENSE_API_KEY EXISTENTE
# ============================================================

get_existing_license_key() {

    local key=""

    if [[ -f "$ENV_FILE" ]]; then

        key="$(
            grep '^LICENSE_API_KEY=' "$ENV_FILE" |
            head -n1 |
            cut -d= -f2-
        )"

    fi

    if [[ ${#key} -ge 32 ]]; then
        printf '%s' "$key"
    fi
}

# ============================================================
# BACKUP SQLITE
# ============================================================

backup_sqlite() {

    [[ -f "$DB_FILE" ]] || {
        warning "SQLite todavía no existe: $DB_FILE"
        return 0
    }

    command -v sqlite3 >/dev/null 2>&1 || {
        cp "$DB_FILE" "$1"
        chmod 600 "$1"
        return 0
    }

    sqlite3 "$DB_FILE" \
        ".backup '$1'" \
        >/dev/null 2>&1 || {

        warning "SQLite backup falló; usando copia directa."

        cp "$DB_FILE" "$1" ||
            return 1
    }

    chmod 600 "$1"

    return 0
}

# ============================================================
# BACKUP COMPLETO
# ============================================================

backup_config() {

    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR/sqlite"

    local date_stamp
    date_stamp="$(date '+%Y%m%d_%H%M%S')"

    local backup_ok=1

    info "Creando backup completo..."

    # --------------------------------------------------------
    # ENV
    # --------------------------------------------------------

    if [[ -f "$ENV_FILE" ]]; then

        cp "$ENV_FILE" \
            "$BACKUP_DIR/env_${date_stamp}.backup" || {

            warning "No se pudo respaldar .env."
            backup_ok=0
        }

        chmod 600 \
            "$BACKUP_DIR/env_${date_stamp}.backup" 2>/dev/null || true

    fi

    # --------------------------------------------------------
    # SQLITE
    # --------------------------------------------------------

    if [[ -f "$DB_FILE" ]]; then

        backup_sqlite \
            "$BACKUP_DIR/sqlite/bot_${date_stamp}.db" || {

            warning "No se pudo respaldar SQLite."
            backup_ok=0
        }

    fi

    # --------------------------------------------------------
    # OWNERS
    # --------------------------------------------------------

    if [[ -f "$OWNERS_FILE" ]]; then

        cp "$OWNERS_FILE" \
            "$BACKUP_DIR/owners_${date_stamp}.json" || {

            warning "No se pudo respaldar owners.json."
            backup_ok=0
        }

        chmod 600 \
            "$BACKUP_DIR/owners_${date_stamp}.json" 2>/dev/null || true

    fi

    # --------------------------------------------------------
    # ELIMINAR BACKUPS ANTIGUOS
    # --------------------------------------------------------

    find "$BACKUP_DIR" \
        -type f \
        -mtime +"$LOG_DAYS" \
        -delete 2>/dev/null || true

    # Mantener aproximadamente BACKUP_COUNT archivos SQLite
    local sqlite_files
    sqlite_files="$(
        find "$BACKUP_DIR/sqlite" \
            -type f \
            -name '*.db' \
            -printf '%T@ %p\n' 2>/dev/null |
        sort -nr |
        awk '{print $2}'
    )"

    if [[ -n "$sqlite_files" ]]; then

        echo "$sqlite_files" |
            tail -n +"$((BACKUP_COUNT + 1))" |
            xargs -r rm -f

    fi

    if (( backup_ok == 1 )); then
        success "Backup completo realizado."
    else
        warning "Backup completado con advertencias."
    fi
}

# ============================================================
# OWNERS
# ============================================================

create_owners_file() {

    mkdir -p "$CONFIG_DIR"

    if [[ ! -f "$OWNERS_FILE" ]]; then

        cat > "$OWNERS_FILE" <<'EOF'
{
  "owners": []
}
EOF

    fi

    if ! jq empty "$OWNERS_FILE" >/dev/null 2>&1; then

        warning "owners.json estaba dañado. Creando uno nuevo."

        cat > "$OWNERS_FILE" <<'EOF'
{
  "owners": []
}
EOF

    fi

    chmod 600 "$OWNERS_FILE"
}

# ============================================================
# AGREGAR OWNER
# ============================================================

add_owner() {

    create_owners_file

    section "👑 AGREGAR OWNER"

    local ID=""
    local NAME=""
    local TYPE=""
    local days=""
    local expires=""
    local created=""

    read -r -p "ID de Telegram: " ID

    if [[ ! "$ID" =~ ^[0-9]+$ ]]; then
        error "El ID debe contener solamente números."
        return
    fi

    if jq -e \
        --arg id "$ID" \
        '.owners[] | select(.id == $id)' \
        "$OWNERS_FILE" >/dev/null 2>&1; then

        error "Ese owner ya existe."
        return
    fi

    read -r -p "Nombre: " NAME

    echo
    echo -e "${CYAN}Duración disponible:${RESET}"
    echo
    echo -e "${GREEN}1)${RESET} 1 día"
    echo -e "${GREEN}2)${RESET} 7 días"
    echo -e "${GREEN}3)${RESET} 15 días"
    echo -e "${GREEN}4)${RESET} 30 días"
    echo -e "${GREEN}5)${RESET} 60 días"
    echo -e "${GREEN}6)${RESET} 90 días"
    echo -e "${GREEN}7)${RESET} 180 días"
    echo -e "${GREEN}8)${RESET} 365 días"
    echo -e "${MAGENTA}9)${RESET} ILIMITADO"
    echo

    read -r -p "Seleccione: " TYPE

    created="$(date '+%Y-%m-%d')"

    case "$TYPE" in

        1) days=1 ;;
        2) days=7 ;;
        3) days=15 ;;
        4) days=30 ;;
        5) days=60 ;;
        6) days=90 ;;
        7) days=180 ;;
        8) days=365 ;;
        9) ;;
        *)
            error "Duración inválida."
            return
            ;;

    esac

    if [[ -n "$days" ]]; then

        expires="$(
            date -d "+${days} days" '+%Y-%m-%d'
        )"

        jq \
            --arg id "$ID" \
            --arg name "$NAME" \
            --arg created "$created" \
            --arg expires "$expires" \
            --argjson days "$days" \
            '.owners += [{
                id: $id,
                name: $name,
                type: "temporary",
                days: $days,
                created: $created,
                expires: $expires,
                status: "active"
            }]' \
            "$OWNERS_FILE" \
            > "$OWNERS_FILE.tmp" || {

            rm -f "$OWNERS_FILE.tmp"
            error "No se pudo guardar el owner."
            return
        }

    else

        jq \
            --arg id "$ID" \
            --arg name "$NAME" \
            --arg created "$created" \
            '.owners += [{
                id: $id,
                name: $name,
                type: "unlimited",
                days: null,
                created: $created,
                expires: null,
                status: "active"
            }]' \
            "$OWNERS_FILE" \
            > "$OWNERS_FILE.tmp" || {

            rm -f "$OWNERS_FILE.tmp"
            error "No se pudo guardar el owner."
            return
        }

    fi

    mv "$OWNERS_FILE.tmp" "$OWNERS_FILE"
    chmod 600 "$OWNERS_FILE"

    success "Owner agregado correctamente."

    echo

    echo -e "${CYAN}ID:${RESET} $ID"
    echo -e "${CYAN}Nombre:${RESET} $NAME"

    if [[ -n "$expires" ]]; then

        echo -e "${CYAN}Duración:${RESET} $days días"
        echo -e "${CYAN}Vence:${RESET} $expires"

    else

        echo -e "${MAGENTA}Duración: ILIMITADO ♾️${RESET}"

    fi
}

# ============================================================
# ACTUALIZAR EXPIRACIONES
# ============================================================

update_expirations() {

    create_owners_file

    local today
    today="$(date '+%Y-%m-%d')"

    jq \
        --arg today "$today" \
        '
        .owners |= map(
            if .expires != null and .expires < $today then
                .status = "expired"
            else
                .status = "active"
            end
        )
        ' \
        "$OWNERS_FILE" \
        > "$OWNERS_FILE.tmp" || {

        rm -f "$OWNERS_FILE.tmp"
        error "No se pudieron actualizar las expiraciones."
        return 1
    }

    mv "$OWNERS_FILE.tmp" "$OWNERS_FILE"
    chmod 600 "$OWNERS_FILE"

    return 0
}

# ============================================================
# LISTAR OWNERS
# ============================================================

list_owners() {

    create_owners_file
    update_expirations >/dev/null 2>&1 || true

    section "👑 LISTADO DE OWNERS"

    local count

    count="$(jq '.owners | length' "$OWNERS_FILE")"

    echo -e "${CYAN}Total de owners: ${WHITE}${count}${RESET}"
    echo

    if [[ "$count" -eq 0 ]]; then

        warning "No hay owners registrados."
        return
    fi

    jq -r '
        .owners[] |
        "ID       : \(.id)
Nombre   : \(.name)
Tipo     : \(.type)
Creado   : \(.created)
Vence    : \(.expires // "ILIMITADO")
Estado   : \(.status)
────────────────────────────────────────────"
    ' "$OWNERS_FILE"
}

# ============================================================
# RENOVAR OWNER
# ============================================================

renew_owner() {

    create_owners_file

    section "🔄 RENOVAR OWNER"

    local ID=""
    local OPTION=""
    local days=""
    local expires=""

    read -r -p "ID del owner: " ID

    if ! jq -e \
        --arg id "$ID" \
        '.owners[] | select(.id == $id)' \
        "$OWNERS_FILE" >/dev/null 2>&1; then

        error "Owner no encontrado."
        return
    fi

    echo
    echo -e "${GREEN}1)${RESET} 7 días"
    echo -e "${GREEN}2)${RESET} 15 días"
    echo -e "${GREEN}3)${RESET} 30 días"
    echo -e "${GREEN}4)${RESET} 60 días"
    echo -e "${GREEN}5)${RESET} 90 días"
    echo -e "${GREEN}6)${RESET} 180 días"
    echo -e "${GREEN}7)${RESET} 365 días"
    echo -e "${MAGENTA}8)${RESET} ILIMITADO"
    echo

    read -r -p "Seleccione: " OPTION

    case "$OPTION" in

        1) days=7 ;;
        2) days=15 ;;
        3) days=30 ;;
        4) days=60 ;;
        5) days=90 ;;
        6) days=180 ;;
        7) days=365 ;;
        8) ;;
        *)
            error "Duración inválida."
            return
            ;;

    esac

    if [[ -n "$days" ]]; then

        expires="$(
            date -d "+${days} days" '+%Y-%m-%d'
        )"

        jq \
            --arg id "$ID" \
            --arg expires "$expires" \
            --argjson days "$days" \
            '.owners |= map(
                if .id == $id then
                    .type = "temporary" |
                    .days = $days |
                    .expires = $expires |
                    .status = "active"
                else
                    .
                end
            )' \
            "$OWNERS_FILE" \
            > "$OWNERS_FILE.tmp" || {

            rm -f "$OWNERS_FILE.tmp"
            error "Error renovando owner."
            return
        }

    else

        jq \
            --arg id "$ID" \
            '.owners |= map(
                if .id == $id then
                    .type = "unlimited" |
                    .days = null |
                    .expires = null |
                    .status = "active"
                else
                    .
                end
            )' \
            "$OWNERS_FILE" \
            > "$OWNERS_FILE.tmp" || {

            rm -f "$OWNERS_FILE.tmp"
            error "Error renovando owner."
            return
        }

    fi

    mv "$OWNERS_FILE.tmp" "$OWNERS_FILE"
    chmod 600 "$OWNERS_FILE"

    success "Owner renovado."

    if [[ -n "$expires" ]]; then
        echo -e "${GREEN}Nuevo vencimiento: $expires${RESET}"
    else
        echo -e "${MAGENTA}Owner convertido a ILIMITADO ♾️${RESET}"
    fi
}

# ============================================================
# ELIMINAR OWNER
# ============================================================

remove_owner() {

    create_owners_file

    section "🗑️ ELIMINAR OWNER"

    local ID=""
    local CONFIRM=""

    read -r -p "ID del owner: " ID

    if ! jq -e \
        --arg id "$ID" \
        '.owners[] | select(.id == $id)' \
        "$OWNERS_FILE" >/dev/null 2>&1; then

        error "Owner no encontrado."
        return
    fi

    read -r -p "¿Confirmar eliminación? [s/n]: " CONFIRM

    [[ "$CONFIRM" == "s" ]] ||
        return

    jq \
        --arg id "$ID" \
        '.owners |= map(select(.id != $id))' \
        "$OWNERS_FILE" \
        > "$OWNERS_FILE.tmp" || {

        rm -f "$OWNERS_FILE.tmp"
        error "No se pudo eliminar."
        return
    }

    mv "$OWNERS_FILE.tmp" "$OWNERS_FILE"
    chmod 600 "$OWNERS_FILE"

    success "Owner eliminado."
}

# ============================================================
# MENÚ OWNERS
# ============================================================

owners_menu() {

    while true; do

        banner

        echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════╗${RESET}"
        echo -e "${MAGENTA}║${WHITE}                  GESTIÓN DE OWNERS                    ${MAGENTA}║${RESET}"
        echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════╝${RESET}"
        echo

        echo -e "${GREEN}1)${RESET} 👑 Agregar Owner"
        echo -e "${GREEN}2)${RESET} 📋 Listar Owners"
        echo -e "${GREEN}3)${RESET} 🔄 Renovar Owner"
        echo -e "${GREEN}4)${RESET} ⏰ Actualizar expiraciones"
        echo -e "${RED}5)${RESET} 🗑️ Eliminar Owner"
        echo -e "${YELLOW}6)${RESET} ↩ Volver"
        echo

        local OPTION=""
        read -r -p "Seleccione: " OPTION

        case "$OPTION" in

            1)
                add_owner
                pause
                ;;

            2)
                list_owners
                pause
                ;;

            3)
                renew_owner
                pause
                ;;

            4)
                update_expirations
                pause
                ;;

            5)
                remove_owner
                pause
                ;;

            6)
                return
                ;;

            *)
                error "Opción inválida."
                sleep 1
                ;;

        esac

    done
}

# ============================================================
# CREAR ENV
# ============================================================


# ============================================================
# DOMINIO DE LICENSE API
# ============================================================

normalize_domain() {
    local domain="$1"
    domain="$(printf '%s' "$domain" | tr -d '[:space:]')"
    domain="${domain#http://}"
    domain="${domain#https://}"
    domain="${domain%%/*}"
    domain="${domain%.}"

    printf '%s' "$domain"
}

validate_domain() {
    local domain="$1"

    [[ -n "$domain" ]] ||
        return 1

    [[ "$domain" != *".."* ]] ||
        return 1

    [[ "$domain" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] ||
        return 1

    return 0
}

get_existing_api_domain() {
    local domain=""

    if [[ -f "$API_DOMAIN_FILE" ]]; then
        domain="$(head -n1 "$API_DOMAIN_FILE" 2>/dev/null | tr -d '[:space:]')"
    fi

    if [[ -z "$domain" && -f "$ENV_FILE" ]]; then
        domain="$(
            grep '^LICENSE_API_URL=' "$ENV_FILE" |
            head -n1 |
            cut -d= -f2- |
            sed -E 's#^https?://##; s#/.*$##'
        )"
    fi

    domain="$(normalize_domain "$domain")"

    if validate_domain "$domain"; then
        printf '%s' "$domain"
    fi
}

ask_api_domain() {
    local domain=""

    while true; do
        read -r -p "🌐 Dominio público para License API (ej. api.midominio.com): " domain
        domain="$(normalize_domain "$domain")"

        if validate_domain "$domain"; then
            printf '%s\n' "$domain" > "$API_DOMAIN_FILE"
            chmod 600 "$API_DOMAIN_FILE"
            API_DOMAIN="$domain"
            success "Dominio de License API: $API_DOMAIN"
            return 0
        fi

        error "Dominio inválido. Ejemplo: api.midominio.com"
    done
}

ensure_api_domain() {
    local existing=""

    existing="$(get_existing_api_domain || true)"

    if [[ -n "$existing" ]]; then
        API_DOMAIN="$existing"
        printf '%s\n' "$API_DOMAIN" > "$API_DOMAIN_FILE"
        chmod 600 "$API_DOMAIN_FILE"
        success "Dominio de License API conservado: $API_DOMAIN"
        return 0
    fi

    if [[ "$SILENT" == "1" ]]; then
        API_DOMAIN="$(normalize_domain "${API_DOMAIN:-${LICENSE_API_DOMAIN:-}}")"
        validate_domain "$API_DOMAIN" ||
            die "Modo silencioso: falta LICENSE_API_DOMAIN/API_DOMAIN válido."
        printf '%s\n' "$API_DOMAIN" > "$API_DOMAIN_FILE"
        chmod 600 "$API_DOMAIN_FILE"
        return 0
    fi

    ask_api_domain
}

configure_license_api_nginx() {
    [[ -n "${API_DOMAIN:-}" ]] ||
        die "No se configuró el dominio de License API."

    command -v nginx >/dev/null 2>&1 ||
        die "Nginx no está instalado."

    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

    cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    listen [::]:80;

    server_name $API_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }
}
EOF

    ln -sfn "$NGINX_SITE" "$NGINX_LINK"

    # Evitar conflictos con el sitio por defecto.
    rm -f /etc/nginx/sites-enabled/default

    nginx -t >/dev/null 2>&1 ||
        die "La configuración de Nginx para License API es inválida."

    systemctl enable nginx >/dev/null 2>&1 || true
    systemctl restart nginx ||
        die "No se pudo iniciar/reiniciar Nginx."

    success "Nginx configurado para: http://$API_DOMAIN"
}

try_enable_api_https() {
    # HTTPS se intenta automáticamente. Si DNS/Cloudflare todavía no apunta
    # al VPS, no se rompe la instalación: la API queda disponible por HTTP.
    command -v certbot >/dev/null 2>&1 || return 0

    if certbot --nginx \
        --non-interactive \
        --agree-tos \
        --register-unsafely-without-email \
        --redirect \
        -d "$API_DOMAIN" >/dev/null 2>&1; then

        LICENSE_API_SCHEME="https"
        success "HTTPS habilitado para License API: https://$API_DOMAIN"
    else
        LICENSE_API_SCHEME="http"
        warning "No se pudo emitir SSL automáticamente. License API queda en http://$API_DOMAIN."
        warning "La instalación continúa sin detenerse."
    fi
}

configure_api() {
    ensure_api_domain
    configure_license_api_nginx

    LICENSE_API_SCHEME="http"
    try_enable_api_https

    # Guardar la URL final usada por el instalador y futuras actualizaciones.
    LICENSE_API_URL="${LICENSE_API_SCHEME}://${API_DOMAIN}"

    printf '%s\n' "$API_DOMAIN" > "$API_DOMAIN_FILE"
    chmod 600 "$API_DOMAIN_FILE"
}


persist_license_api_url() {
    [[ -n "${LICENSE_API_URL:-}" ]] || return 0
    [[ -f "$ENV_FILE" ]] || return 0

    if grep -q '^LICENSE_API_URL=' "$ENV_FILE"; then
        sed -i "s|^LICENSE_API_URL=.*|LICENSE_API_URL=$LICENSE_API_URL|" "$ENV_FILE"
    else
        printf '\nLICENSE_API_URL=%s\n' "$LICENSE_API_URL" >> "$ENV_FILE"
    fi

    chmod 600 "$ENV_FILE"
    success "LICENSE_API_URL configurada: $LICENSE_API_URL"
}

create_env() {

    local bot_token="$1"
    local owner_id="$2"
    local cloudflare_token="$3"
    local cloudflare_zone="$4"
    local license_api_url="${5:-${LICENSE_API_URL:-http://${API_DOMAIN:-localhost}}}"

    local license_api_key=""

    # ========================================================
    # CONSERVAR CLAVE EXISTENTE
    # ========================================================

    license_api_key="$(get_existing_license_key || true)"

    # ========================================================
    # GENERAR SI NO EXISTE
    # ========================================================

    if [[ ${#license_api_key} -lt 32 ]]; then

        license_api_key="$(generate_license_key)"

        success "Nueva LICENSE_API_KEY generada."

    else

        success "LICENSE_API_KEY existente conservada."

    fi

    # ========================================================
    # CREAR ENV
    # ========================================================

    cat > "$ENV_FILE" <<EOF
BOT_TOKEN=$bot_token
OWNER_ID=$owner_id

# License API
LICENSE_API_KEY=$license_api_key
LICENSE_API_HOST=127.0.0.1
LICENSE_API_PORT=8787
LICENSE_API_URL=$license_api_url

# Cloudflare
CLOUDFLARE_TOKEN=$cloudflare_token
CLOUDFLARE_ZONE_ID=$cloudflare_zone

# SQLite
DATABASE_PATH=$DB_FILE

# Owners
OWNERS_FILE=$OWNERS_FILE

# Producción
NODE_ENV=production
EOF

    chmod 600 "$ENV_FILE"

    # Verificación crítica: evitar iniciar el bot con credenciales ausentes.
    grep -q '^BOT_TOKEN=' "$ENV_FILE" || die "BOT_TOKEN no quedó guardado en .env."
    grep -q '^CLOUDFLARE_TOKEN=' "$ENV_FILE" || die "CLOUDFLARE_TOKEN no quedó guardado en .env."
    grep -q '^CLOUDFLARE_ZONE_ID=' "$ENV_FILE" || die "CLOUDFLARE_ZONE_ID no quedó guardado en .env."

    success "Archivo .env configurado correctamente."

    # Mostrar únicamente una comprobación segura; nunca imprimir secretos.
    local token_len=${#bot_token}
    local cf_len=${#cloudflare_token}
    if (( token_len > 8 )); then
        success "BOT_TOKEN guardado en .env (${bot_token:0:4}••••${bot_token: -4}, ${token_len} caracteres)."
    else
        warning "BOT_TOKEN quedó vacío o es demasiado corto en .env."
    fi

    if (( cf_len > 0 )); then
        success "CLOUDFLARE_TOKEN guardado en .env (${cf_len} caracteres)."
    else
        info "CLOUDFLARE_TOKEN: omitido (ENTER)."
    fi

    if [[ -n "$cloudflare_zone" ]]; then
        success "CLOUDFLARE_ZONE_ID guardado en .env."
    else
        info "CLOUDFLARE_ZONE_ID: omitido (ENTER)."
    fi

    # Validar Telegram DESPUÉS de guardar .env para que el instalador nunca
    # pierda el token introducido si Telegram está temporalmente inaccesible.
    validate_bot_token "$bot_token"
}

# ============================================================
# ASEGURAR LICENSE_API_KEY
# ============================================================

ensure_license_key() {

    [[ -f "$ENV_FILE" ]] ||
        return 1

    local current_key=""

    current_key="$(
        grep '^LICENSE_API_KEY=' "$ENV_FILE" |
        head -n1 |
        cut -d= -f2-
    )"

    if [[ ${#current_key} -ge 32 ]]; then
        return 0
    fi

    local new_key
    new_key="$(generate_license_key)"

    if grep -q '^LICENSE_API_KEY=' "$ENV_FILE"; then

        sed -i \
            "s|^LICENSE_API_KEY=.*|LICENSE_API_KEY=$new_key|" \
            "$ENV_FILE"

    else

        printf '\nLICENSE_API_KEY=%s\n' "$new_key" >> "$ENV_FILE"

    fi

    chmod 600 "$ENV_FILE"

    success "LICENSE_API_KEY corregida automáticamente."

    return 0
}

# ============================================================
# OWNER PRINCIPAL
# ============================================================

ensure_main_owner() {

    create_owners_file

    local owner="$1"

    [[ -n "$owner" ]] || return 0

    if ! jq -e \
        --arg id "$owner" \
        '.owners[] | select(.id == $id)' \
        "$OWNERS_FILE" >/dev/null 2>&1; then

        jq \
            --arg id "$owner" \
            '.owners += [{
                id: $id,
                name: "Owner Principal",
                type: "unlimited",
                days: null,
                created: (now | strftime("%Y-%m-%d")),
                expires: null,
                status: "active"
            }]' \
            "$OWNERS_FILE" \
            > "$OWNERS_FILE.tmp" || {

            rm -f "$OWNERS_FILE.tmp"
            error "No se pudo crear Owner Principal."
            return 1
        }

        mv "$OWNERS_FILE.tmp" "$OWNERS_FILE"

        chmod 600 "$OWNERS_FILE"

        success "Owner principal registrado como ilimitado."

    fi
}

# ============================================================
# VALIDAR CREDENCIALES
# ============================================================

validate_bot_token() {
    local token="$1"

    [[ -n "$token" ]] || die "Token del Bot vacío."
    require_command curl

    info "Validando Token de Telegram..."

    local response=""
    response="$(curl -fsS --max-time 15 "https://api.telegram.org/bot${token}/getMe" 2>/dev/null || true)"

    if [[ "$response" != *'"ok":true'* ]]; then
        die "El Token del Bot no es válido. No se iniciará PM2."
    fi

    success "Token de Telegram válido."
}

validate_cloudflare_pair() {
    # Cloudflare es opcional. Si el usuario lo deja vacío, se guarda vacío.
    # No se consulta Cloudflare durante la instalación.
    return 0
}

# ============================================================
# CONFIGURAR PROYECTO
# ============================================================

configure_project() {

    section "⚙️ CONFIGURACIÓN DEL PROYECTO"

    local repo="$DEFAULT_REPO"
    local bot_token=""
    local owner_id=""
    local cloudflare_token=""
    local cloudflare_zone=""
    local api_domain=""

    if [[ "$SILENT" == "1" ]]; then

        repo="${REPO:-$DEFAULT_REPO}"
        bot_token="${BOT_TOKEN:-}"
        owner_id="${OWNER_ID:-}"
        cloudflare_token="${CLOUDFLARE_TOKEN:-}"
        cloudflare_zone="${CLOUDFLARE_ZONE_ID:-}"
        api_domain="${LICENSE_API_DOMAIN:-${API_DOMAIN:-}}"

        [[ -n "$bot_token" ]] ||
            die "Modo silencioso: falta BOT_TOKEN."

        [[ -n "$owner_id" ]] ||
            die "Modo silencioso: falta OWNER_ID."

    else

        read_secret "Token del Bot"
        bot_token="$REPLY_SECRET"

        [[ -n "$bot_token" ]] ||
            die "Token vacío."

        read -r -p \
            "ID Owner Principal: " \
            owner_id

        [[ "$owner_id" =~ ^[0-9]+$ ]] ||
            die "OWNER_ID inválido."

        echo
        ask_api_domain
        api_domain="$API_DOMAIN"

        echo
        echo -e "${YELLOW}Cloudflare es opcional.${RESET}"
        echo

        read_secret "Cloudflare API Token (ENTER para omitir)"
        cloudflare_token="$REPLY_SECRET"

        read -r -p \
            "Cloudflare Zone ID (ENTER para omitir): " \
            cloudflare_zone

    fi

    # Validar antes de continuar, pero conservar siempre los valores
    # proporcionados en .env incluso si una validación externa falla.
    validate_cloudflare_pair

    if [[ -n "$api_domain" ]]; then
        API_DOMAIN="$(normalize_domain "$api_domain")"
        validate_domain "$API_DOMAIN" || die "LICENSE_API_DOMAIN inválido."
    else
        ensure_api_domain
    fi

    backup_config

    # ========================================================
    # GUARDAR CONFIGURACIÓN ACTUAL ANTES DE CLONAR
    # ========================================================

    local old_env_backup=""

    if [[ -f "$ENV_FILE" ]]; then

        old_env_backup="$BACKUP_DIR/env_preinstall.backup"

        cp "$ENV_FILE" "$old_env_backup"
        chmod 600 "$old_env_backup"

    fi

    info "Descargando proyecto..."

    # No borrar hasta tener configuración respaldada
    rm -rf "$INSTALL_DIR"

    git clone "$repo" "$INSTALL_DIR" \
        >/dev/null 2>&1 ||
        die "No se pudo clonar el repositorio."

    mkdir -p "$DB_DIR"

    # ========================================================
    # RECUPERAR LICENSE API KEY ANTERIOR
    # ========================================================

    local previous_license=""

    if [[ -n "$old_env_backup" ]] &&
       [[ -f "$old_env_backup" ]]; then

        previous_license="$(
            grep '^LICENSE_API_KEY=' \
                "$old_env_backup" |
            head -n1 |
            cut -d= -f2-
        )"

    fi

    if [[ ${#previous_license} -ge 32 ]]; then

        create_env \
            "$bot_token" \
            "$owner_id" \
            "$cloudflare_token" \
            "$cloudflare_zone" \
            "$LICENSE_API_URL"

        sed -i \
            "s|^LICENSE_API_KEY=.*|LICENSE_API_KEY=$previous_license|" \
            "$ENV_FILE"

    else

        create_env \
            "$bot_token" \
            "$owner_id" \
            "$cloudflare_token" \
            "$cloudflare_zone" \
            "$LICENSE_API_URL"

    fi

    chmod 600 "$ENV_FILE"

    ensure_main_owner "$owner_id"

    restore_latest_sqlite

    # Instalar dependencias sin arrancar todavía el bot.
    install_project

    # Publicar y comprobar la License API antes de arrancar Telegram.
    configure_api
    persist_license_api_url

    # El .env definitivo ya contiene BOT_TOKEN y Cloudflare.
    start_bot
    restart_bot
}

# ============================================================
# RESTAURAR SQLITE
# ============================================================

restore_latest_sqlite() {

    mkdir -p "$DB_DIR"

    local latest_db=""

    latest_db="$(
        find "$BACKUP_DIR/sqlite" \
            -type f \
            -name '*.db' \
            -printf '%T@ %p\n' 2>/dev/null |
        sort -nr |
        head -n1 |
        cut -d' ' -f2-
    )"

    if [[ -z "$latest_db" ]]; then
        info "No existe backup SQLite anterior."
        return 0
    fi

    if [[ -f "$DB_FILE" ]]; then
        return 0
    fi

    info "Restaurando SQLite desde backup..."

    cp "$latest_db" "$DB_FILE" ||
        warning "No se pudo restaurar SQLite."

    chmod 600 "$DB_FILE" 2>/dev/null || true

    success "SQLite restaurado."
}

# ============================================================
# INSTALAR PROYECTO
# ============================================================

install_project() {

    cd "$INSTALL_DIR" ||
        die "No se pudo entrar al proyecto."

    [[ -f package.json ]] ||
        die "No se encontró package.json."

    ensure_license_key

    info "Instalando dependencias Node.js..."

    if [[ -f package-lock.json ]]; then

        if ! npm ci --omit=dev >/dev/null 2>&1; then

            npm install --omit=dev >/dev/null 2>&1 ||
                die "Error instalando dependencias."

        fi

    else

        npm install --omit=dev >/dev/null 2>&1 ||
            die "Error instalando dependencias."

    fi

    success "Dependencias instaladas."

    # El bot se inicia al final de la instalación, después de validar .env
    # y dejar lista la License API.
}

# ============================================================
# PM2 STARTUP
# ============================================================

configure_pm2_startup() {

    info "Configurando PM2 persistente..."

    pm2 startup systemd \
        -u root \
        --hp /root \
        > /tmp/kevintech-pm2.txt 2>&1 || true

    local startup_cmd=""

    startup_cmd="$(
        grep -E \
            'sudo .*pm2 startup|env PATH=.*pm2 startup' \
            /tmp/kevintech-pm2.txt |
        head -n1
    )"

    if [[ -n "$startup_cmd" ]]; then

        startup_cmd="${startup_cmd#sudo }"

        bash -c "$startup_cmd" \
            >/dev/null 2>&1 || true

    fi

    pm2 save >/dev/null 2>&1 || true

    rm -f /tmp/kevintech-pm2.txt

    success "PM2 configurado para iniciar automáticamente."
}

# ============================================================
# INICIAR BOT
# ============================================================

start_bot() {

    cd "$INSTALL_DIR" ||
        return 1

    [[ -f index.js ]] ||
        die "No se encontró index.js."

    ensure_license_key

    info "Iniciando bot con PM2..."

    pm2 delete "$PM2_NAME" \
        >/dev/null 2>&1 || true

    pm2 start index.js \
        --name "$PM2_NAME" \
        --time \
        >/dev/null 2>&1 ||
        die "No se pudo iniciar el bot."

    configure_pm2_startup

    sleep 3

    if pm2 describe "$PM2_NAME" \
        >/dev/null 2>&1; then

        success "Bot iniciado correctamente."

    else

        die "PM2 no pudo registrar el bot."

    fi
}

# ============================================================
# ACTUALIZAR BOT
# ============================================================

update_bot() {

    [[ -d "$INSTALL_DIR/.git" ]] ||
        die "El bot no está instalado."

    section "🔄 ACTUALIZACIÓN"

    # ========================================================
    # BACKUP ANTES DE ACTUALIZAR
    # ========================================================

    backup_config

    # ========================================================
    # GUARDAR CONFIGURACIÓN
    # ========================================================

    local saved_env="$BACKUP_DIR/env_update.backup"
    local saved_db="$BACKUP_DIR/sqlite/update.db"

    mkdir -p "$BACKUP_DIR/sqlite"

    if [[ -f "$ENV_FILE" ]]; then

        cp "$ENV_FILE" "$saved_env"
        chmod 600 "$saved_env"

    fi

    if [[ -f "$DB_FILE" ]]; then

        backup_sqlite "$saved_db" || true

    fi

    # ========================================================
    # DETENER BOT
    # ========================================================

    info "Deteniendo bot..."

    pm2 stop "$PM2_NAME" \
        >/dev/null 2>&1 || true

    cd "$INSTALL_DIR" ||
        die "No se pudo entrar al proyecto."

    # ========================================================
    # ACTUALIZAR GIT
    # ========================================================

    info "Descargando cambios desde GitHub..."

    git fetch --all >/dev/null 2>&1 ||
        die "git fetch falló."

    local branch=""

    branch="$(
        git symbolic-ref \
            --short HEAD 2>/dev/null || true
    )"

    if [[ -n "$branch" ]]; then

        git reset --hard "origin/$branch" \
            >/dev/null 2>&1 ||
            die "No se pudo actualizar el proyecto."

    else

        git pull >/dev/null 2>&1 ||
            die "No se pudo actualizar el proyecto."

    fi

    # ========================================================
    # RESTAURAR ENV
    # ========================================================

    if [[ -f "$saved_env" ]]; then

        cp "$saved_env" "$ENV_FILE"
        chmod 600 "$ENV_FILE"

        success ".env restaurado."

    fi

    # ========================================================
    # ASEGURAR LICENSE
    # ========================================================

    ensure_license_key

    # ========================================================
    # RESTAURAR SQLITE
    # ========================================================

    mkdir -p "$DB_DIR"

    if [[ -f "$saved_db" ]]; then

        if [[ ! -f "$DB_FILE" ]]; then

            cp "$saved_db" "$DB_FILE"

        fi

        chmod 600 "$DB_FILE"

        success "SQLite protegido."

    fi

    # ========================================================
    # OWNERS
    # ========================================================

    create_owners_file

    # ========================================================
    # LICENSE API / NGINX
    # ========================================================

    ensure_api_domain

    # ========================================================
    # DEPENDENCIAS
    # ========================================================

    install_project

    # La API ya está levantada; aplicar/reparar el proxy público.
    configure_api
    persist_license_api_url
    restart_bot

    success "Actualización completada."
}

# ============================================================
# REINICIAR
# ============================================================

restart_bot() {

    if ! pm2 describe "$PM2_NAME" \
        >/dev/null 2>&1; then

        error "El bot no está registrado en PM2."
        return 1
    fi

    ensure_license_key

    info "Reiniciando bot..."

    pm2 restart "$PM2_NAME" \
        --update-env \
        >/dev/null 2>&1 ||
        die "No se pudo reiniciar."

    pm2 save >/dev/null 2>&1 || true

    success "Bot reiniciado."
}

# ============================================================
# ESTADO
# ============================================================

status_bot() {

    section "📊 ESTADO DEL BOT"

    if ! command -v pm2 >/dev/null 2>&1; then

        error "PM2 no está instalado."
        return
    fi

    pm2 status

    echo

    if pm2 describe "$PM2_NAME" \
        >/dev/null 2>&1; then

        local status

        status="$(
            pm2 jlist 2>/dev/null |
            jq -r \
                --arg name "$PM2_NAME" \
                '.[] |
                 select(.name == $name) |
                 .pm2_env.status' |
            head -n1
        )"

        case "$status" in

            online)
                echo -e "${GREEN}● BOT ONLINE${RESET}"
                ;;

            stopped)
                echo -e "${RED}● BOT DETENIDO${RESET}"
                ;;

            errored)
                echo -e "${RED}● BOT CON ERROR${RESET}"
                ;;

            *)
                echo -e "${YELLOW}● ESTADO: ${status:-desconocido}${RESET}"
                ;;

        esac

    else

        error "El bot no está registrado en PM2."

    fi

    echo

    if [[ -f "$DB_FILE" ]]; then

        echo -e "${GREEN}🗄️ SQLite:${RESET} $DB_FILE"

    else

        echo -e "${YELLOW}🗄️ SQLite: no encontrado${RESET}"

    fi

    if [[ -f "$ENV_FILE" ]]; then

        local key_length

        key_length="$(
            grep '^LICENSE_API_KEY=' "$ENV_FILE" |
            head -n1 |
            cut -d= -f2- |
            awk '{print length}'
        )"

        if [[ "$key_length" =~ ^[0-9]+$ ]] &&
           (( key_length >= 32 )); then

            echo -e "${GREEN}🔐 License API: configurada (${key_length} caracteres)${RESET}"

        else

            echo -e "${RED}🔐 License API: inválida${RESET}"

        fi

    fi
}

# ============================================================
# LOGS
# ============================================================

show_logs() {

    if ! command -v pm2 >/dev/null 2>&1; then

        error "PM2 no está instalado."
        return
    fi

    pm2 logs "$PM2_NAME" \
        --lines 50
}

# ============================================================
# LIMPIAR LOGS
# ============================================================

clear_logs() {

    section "🧹 LIMPIEZA DE LOGS"

    echo -e "${YELLOW}Se eliminarán logs con más de $LOG_DAYS días.${RESET}"
    echo

    local CONFIRM=""

    read -r -p "¿Continuar? [s/n]: " CONFIRM

    [[ "$CONFIRM" == "s" ]] ||
        return

    clean_old_logs

    if command -v pm2 >/dev/null 2>&1; then
        pm2 flush >/dev/null 2>&1 || true
    fi

    success "Logs limpiados."
}

# ============================================================
# CAMBIAR TOKEN
# ============================================================

change_token() {

    [[ -f "$ENV_FILE" ]] ||
        die "No existe .env."

    local new_token=""

    read_secret "Nuevo Token"
    new_token="$REPLY_SECRET"

    [[ -n "$new_token" ]] ||
        die "Token vacío."

    backup_config

    if grep -q '^BOT_TOKEN=' "$ENV_FILE"; then

        sed -i \
            "s|^BOT_TOKEN=.*|BOT_TOKEN=$new_token|" \
            "$ENV_FILE"

    else

        printf '\nBOT_TOKEN=%s\n' "$new_token" >> "$ENV_FILE"

    fi

    chmod 600 "$ENV_FILE"

    restart_bot

    success "Token actualizado."
}

# ============================================================
# CAMBIAR OWNER PRINCIPAL
# ============================================================

change_owner() {

    [[ -f "$ENV_FILE" ]] ||
        die "No existe .env."

    local new_owner=""

    read -r -p \
        "Nuevo OWNER_ID: " \
        new_owner

    [[ "$new_owner" =~ ^[0-9]+$ ]] ||
        die "OWNER_ID inválido."

    backup_config

    if grep -q '^OWNER_ID=' "$ENV_FILE"; then

        sed -i \
            "s|^OWNER_ID=.*|OWNER_ID=$new_owner|" \
            "$ENV_FILE"

    else

        printf '\nOWNER_ID=%s\n' "$new_owner" >> "$ENV_FILE"

    fi

    ensure_main_owner "$new_owner"

    chmod 600 "$ENV_FILE"

    restart_bot

    success "Owner principal actualizado."
}

# ============================================================
# CAMBIAR CLOUDFLARE
# ============================================================

change_cloudflare() {

    [[ -f "$ENV_FILE" ]] ||
        die "No existe .env."

    section "☁️ CONFIGURACIÓN CLOUDFLARE"

    local current_token=""
    local current_zone=""
    local new_token=""
    local new_zone=""

    # ========================================================
    # LEER CONFIGURACIÓN ACTUAL
    # ========================================================

    current_token="$(
        grep '^CLOUDFLARE_TOKEN=' "$ENV_FILE" |
        head -n1 |
        cut -d= -f2-
    )"

    current_zone="$(
        grep '^CLOUDFLARE_ZONE_ID=' "$ENV_FILE" |
        head -n1 |
        cut -d= -f2-
    )"

    echo -e "${CYAN}Configuración actual:${RESET}"
    echo

    if [[ -n "$current_token" ]]; then
        echo -e "${GREEN}✓ Cloudflare Token:${RESET} configurado"
    else
        echo -e "${YELLOW}⚠ Cloudflare Token:${RESET} no configurado"
    fi

    if [[ -n "$current_zone" ]]; then
        echo -e "${GREEN}✓ Zone ID:${RESET} $current_zone"
    else
        echo -e "${YELLOW}⚠ Zone ID:${RESET} no configurado"
    fi

    echo
    echo -e "${YELLOW}Deja ENTER para conservar el valor actual.${RESET}"
    echo

    # ========================================================
    # NUEVO TOKEN
    # ========================================================

    read_secret "Nuevo Cloudflare API Token (ENTER = conservar)"
    new_token="$REPLY_SECRET"

    if [[ -z "$new_token" ]]; then
        new_token="$current_token"
        info "Se conservará el Cloudflare API Token actual."
    fi

    # ========================================================
    # NUEVO ZONE ID
    # ========================================================

    read -r -p \
        "Nuevo Zone ID (ENTER = conservar): " \
        new_zone

    if [[ -z "$new_zone" ]]; then
        new_zone="$current_zone"
        info "Se conservará el Zone ID actual."
    fi

    # ========================================================
    # CAMBIO DIRECTO
    # ========================================================
    # No se consulta Cloudflare ni se valida el token aquí.
    # El usuario pidió que esta opción solo cambie la configuración.

    # ========================================================
    # BACKUP ANTES DE MODIFICAR
    # ========================================================

    backup_config

    # ========================================================
    # ACTUALIZAR TOKEN
    # ========================================================

    if grep -q '^CLOUDFLARE_TOKEN=' "$ENV_FILE"; then

        sed -i \
            "s|^CLOUDFLARE_TOKEN=.*|CLOUDFLARE_TOKEN=$new_token|" \
            "$ENV_FILE"

    else

        printf '\nCLOUDFLARE_TOKEN=%s\n' \
            "$new_token" >> "$ENV_FILE"

    fi

    # ========================================================
    # ACTUALIZAR ZONE ID
    # ========================================================

    if grep -q '^CLOUDFLARE_ZONE_ID=' "$ENV_FILE"; then

        sed -i \
            "s|^CLOUDFLARE_ZONE_ID=.*|CLOUDFLARE_ZONE_ID=$new_zone|" \
            "$ENV_FILE"

    else

        printf 'CLOUDFLARE_ZONE_ID=%s\n' \
            "$new_zone" >> "$ENV_FILE"

    fi

    chmod 600 "$ENV_FILE"

    # ========================================================
    # REINICIAR BOT
    # ========================================================

    echo
    info "Aplicando nueva configuración..."

    if ! restart_bot; then

        error "No se pudo reiniciar el bot."

        return 1
    fi

    echo
    success "Cloudflare actualizado correctamente."
    success "El nuevo token y Zone ID quedaron guardados sin validación externa."

    echo
    echo -e "${CYAN}Zone ID:${RESET} $new_zone"
    echo -e "${GREEN}Estado:${RESET} GUARDADO ✓"
}

# ============================================================
# BACKUP MANUAL
# ============================================================

manual_backup() {

    section "💾 BACKUP COMPLETO"

    backup_config

    echo
    echo -e "${GREEN}Backups disponibles:${RESET}"
    echo

    if [[ -d "$BACKUP_DIR" ]]; then

        find "$BACKUP_DIR" \
            -maxdepth 2 \
            -type f \
            -printf '%TY-%Tm-%Td %TH:%TM  %p\n' 2>/dev/null |
        sort -r |
        head -n 50

    fi
}

# ============================================================
# DESINSTALAR
# ============================================================

uninstall_bot() {

    section "🗑️ DESINSTALACIÓN"

    echo -e "${RED}ATENCIÓN${RESET}"
    echo
    echo "Se eliminará:"
    echo "  • Bot"
    echo "  • Dependencias del proyecto"
    echo "  • Proceso PM2"
    echo
    echo "Los backups NO serán eliminados."
    echo
    echo -e "${YELLOW}La base SQLite será respaldada antes de eliminar el proyecto.${RESET}"
    echo

    local CONFIRM=""

    read -r -p \
        "¿Confirmar? escribe SI: " \
        CONFIRM

    [[ "$CONFIRM" == "SI" ]] ||
        return

    backup_config

    pm2 stop "$PM2_NAME" \
        >/dev/null 2>&1 || true

    pm2 delete "$PM2_NAME" \
        >/dev/null 2>&1 || true

    pm2 save >/dev/null 2>&1 || true

    rm -rf "$INSTALL_DIR"

    success "Bot eliminado correctamente."

    echo
    echo -e "${CYAN}Tus backups siguen en:${RESET}"
    echo -e "${WHITE}$BACKUP_DIR${RESET}"
}

# ============================================================
# INSTALACIÓN SILENCIOSA
# ============================================================

silent_install() {

    SILENT=1

    check_root
    check_os
    create_directories

    clean_old_logs
    install_packages
    install_node
    install_pm2

    if [[ -d "$INSTALL_DIR/.git" ]]; then

        update_bot

    else

        configure_project

    fi

    update_expirations

    log "Instalación silenciosa completada."
}

# ============================================================
# INSTALAR / ACTUALIZAR
# ============================================================

install_or_update() {

    check_root
    check_os
    create_directories

    clean_old_logs
    install_packages
    install_node
    install_pm2

    if [[ -d "$INSTALL_DIR/.git" ]]; then

        update_bot

    else

        configure_project

    fi

    update_expirations

    success "Proceso de instalación/actualización finalizado."
}

# ============================================================
# MENÚ PRINCIPAL
# ============================================================

menu() {

    while true; do

        banner

        echo -e "${WHITE}╔══════════════════════════════════════════════════════════════╗${RESET}"
        echo -e "${WHITE}║${CYAN}                 KEVINTECH CONTROL CENTER                  ${WHITE}║${RESET}"
        echo -e "${WHITE}╚══════════════════════════════════════════════════════════════╝${RESET}"
        echo

        echo -e "${GREEN}01${RESET}  🚀 Instalar / Actualizar Bot"
        echo -e "${GREEN}02${RESET}  🔄 Reiniciar Bot"
        echo -e "${GREEN}03${RESET}  📊 Estado del Bot"
        echo -e "${GREEN}04${RESET}  📜 Ver Logs"
        echo -e "${GREEN}05${RESET}  🧹 Limpiar Logs"
        echo -e "${GREEN}06${RESET}  🔑 Cambiar Token"
        echo -e "${GREEN}07${RESET}  👑 Cambiar Owner Principal"
        echo -e "${GREEN}08${RESET}  👥 Gestionar Owners"
        echo -e "${GREEN}09${RESET}  ☁️  Configurar Cloudflare"
        echo -e "${GREEN}10${RESET}  💾 Backup Completo"
        echo -e "${RED}11${RESET}  🗑️  Desinstalar Bot"
        echo -e "${YELLOW}12${RESET}  🚪 Salir"
        echo

        local OPTION=""

        read -r -p \
            "Seleccione una opción: " \
            OPTION

        case "$OPTION" in

            1)
                install_or_update
                pause
                ;;

            2)
                restart_bot
                pause
                ;;

            3)
                status_bot
                pause
                ;;

            4)
                show_logs
                ;;

            5)
                clear_logs
                pause
                ;;

            6)
                change_token
                pause
                ;;

            7)
                change_owner
                pause
                ;;

            8)
                owners_menu
                ;;

            9)
                change_cloudflare
                pause
                ;;

            10)
                manual_backup
                pause
                ;;

            11)
                uninstall_bot
                pause
                ;;

            12)
                clear

                echo
                echo -e "${CYAN}KevinTech Multi Script Bot${RESET}"
                echo -e "${GREEN}Hasta pronto.${RESET}"
                echo

                exit 0
                ;;

            *)
                error "Opción inválida."
                sleep 1
                ;;

        esac

    done
}

# ============================================================
# VALIDACIÓN DEL INSTALADOR
# ============================================================

self_check() {

    # Verificar que estamos ejecutando Bash
    [[ -n "$BASH_VERSION" ]] ||
        die "Este instalador requiere Bash."

    # Verificar herramientas básicas
    command -v date >/dev/null 2>&1 ||
        die "No se encontró date."

    command -v find >/dev/null 2>&1 ||
        die "No se encontró find."

    command -v grep >/dev/null 2>&1 ||
        die "No se encontró grep."

    command -v sed >/dev/null 2>&1 ||
        die "No se encontró sed."

    command -v awk >/dev/null 2>&1 ||
        die "No se encontró awk."
}

# ============================================================
# MAIN
# ============================================================

main() {

    self_check
    check_root
    create_directories

    if [[ "$1" == "--silent" ||
          "$SILENT" == "1" ]]; then

        silent_install

    else

        menu

    fi
}

main "$@"