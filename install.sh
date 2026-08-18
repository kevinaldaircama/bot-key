#!/bin/bash

# ============================================================
#       KEVINTECH MULTI SCRIPT VPN BOT INSTALLER v4
# ============================================================
# Autor: Kevin Aldair
#
# Ubuntu 20.04 / 22.04 / 24.04
#
# Funciones:
#   Instalación / actualización
#   Multi-owner
#   Owners temporales
#   Owners ilimitados
#   Renovación
#   Eliminación
#   Expiración automática
#   Backups
#   Limpieza de logs
#   Instalación silenciosa
#   PM2 persistente
#   Firebase
#   Cloudflare
# ============================================================

set -o pipefail

# ============================================================
# CONFIGURACIÓN
# ============================================================

BOT_NAME="Multi Script VPN Bot"
INSTALL_DIR="/opt/multi-script-bot"
CONFIG_DIR="/etc/kevintech/multiscript"
BACKUP_DIR="$CONFIG_DIR/backups"
LOG_DIR="$CONFIG_DIR/logs"

ENV_FILE="$INSTALL_DIR/.env"
OWNERS_FILE="$CONFIG_DIR/owners.json"
FIREBASE_CONFIG="$CONFIG_DIR/firebase-admin.json"

INSTALL_LOG="$LOG_DIR/installer.log"

PM2_NAME="multiscriptbot"
NODE_VERSION="22"

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
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║              KEVINTECH MULTI SCRIPT BOT                 ║"
    echo "║                       INSTALLER v4                       ║"
    echo "║                                                          ║"
    echo "║        MULTI OWNER • EXPIRACIÓN • BACKUP • PM2         ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${RESET}"

}

section() {

    [[ "$SILENT" == "1" ]] && return

    echo
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${WHITE} $* ${RESET}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
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

    touch "$INSTALL_LOG"

    chmod 700 "$CONFIG_DIR"
    chmod 700 "$BACKUP_DIR"
    chmod 700 "$LOG_DIR"
    chmod 600 "$INSTALL_LOG"

}

# ============================================================
# COMPROBAR COMANDOS
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
        ca-certificates \
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

    read -r -s -p "$prompt: " value
    echo

    printf '%s' "$value"

}

# ============================================================
# BACKUP
# ============================================================

backup_config() {

    mkdir -p "$BACKUP_DIR"

    local date_stamp
    date_stamp="$(date '+%Y%m%d_%H%M%S')"

    if [[ -f "$ENV_FILE" ]]; then

        cp "$ENV_FILE" \
            "$BACKUP_DIR/env_${date_stamp}.backup"

        chmod 600 \
            "$BACKUP_DIR/env_${date_stamp}.backup"

    fi

    if [[ -f "$INSTALL_DIR/firebase-admin.json" ]]; then

        cp "$INSTALL_DIR/firebase-admin.json" \
            "$BACKUP_DIR/firebase_${date_stamp}.json"

        chmod 600 \
            "$BACKUP_DIR/firebase_${date_stamp}.json"

    fi

    if [[ -f "$OWNERS_FILE" ]]; then

        cp "$OWNERS_FILE" \
            "$BACKUP_DIR/owners_${date_stamp}.json"

        chmod 600 \
            "$BACKUP_DIR/owners_${date_stamp}.json"

    fi

    # Mantener solamente los últimos backups
    local files
    files="$(
        ls -1t "$BACKUP_DIR"/* 2>/dev/null |
        tail -n +"$((BACKUP_COUNT + 1))"
    )"

    if [[ -n "$files" ]]; then
        printf '%s\n' "$files" | xargs -r rm -f
    fi

    success "Backup realizado."

}

# ============================================================
# OWNERS
# ============================================================

create_owners_file() {

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

    local days=""
    local expires=""
    local created=""

    created="$(date '+%Y-%m-%d')"

    case "$TYPE" in

        1)
            days=1
            ;;

        2)
            days=7
            ;;

        3)
            days=15
            ;;

        4)
            days=30
            ;;

        5)
            days=60
            ;;

        6)
            days=90
            ;;

        7)
            days=180
            ;;

        8)
            days=365
            ;;

        9)
            ;;

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

    if [[ -n "$expires" ]]; then

        echo -e "${CYAN}ID:${RESET} $ID"
        echo -e "${CYAN}Nombre:${RESET} $NAME"
        echo -e "${CYAN}Duración:${RESET} $days días"
        echo -e "${CYAN}Vence:${RESET} $expires"

    else

        echo -e "${CYAN}ID:${RESET} $ID"
        echo -e "${CYAN}Nombre:${RESET} $NAME"
        echo -e "${MAGENTA}Duración: ILIMITADO ♾️${RESET}"

    fi

}

# ============================================================
# LISTAR OWNERS
# ============================================================

list_owners() {

    create_owners_file
    update_expirations >/dev/null 2>&1

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

    success "Expiraciones actualizadas."

}

# ============================================================
# RENOVAR OWNER
# ============================================================

renew_owner() {

    create_owners_file

    section "🔄 RENOVAR OWNER"

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

    local days=""
    local expires=""

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
        echo -e "${GREEN}Nuevo vencimiento: ${expires}${RESET}"
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

        echo -e "${MAGENTA}╔══════════════════════════════════════════════════╗${RESET}"
        echo -e "${MAGENTA}║${WHITE}              GESTIÓN DE OWNERS                ${MAGENTA}║${RESET}"
        echo -e "${MAGENTA}╚══════════════════════════════════════════════════╝${RESET}"
        echo

        echo -e "${GREEN}1)${RESET} 👑 Agregar Owner"
        echo -e "${GREEN}2)${RESET} 📋 Listar Owners"
        echo -e "${GREEN}3)${RESET} 🔄 Renovar Owner"
        echo -e "${GREEN}4)${RESET} ⏰ Actualizar expiraciones"
        echo -e "${RED}5)${RESET} 🗑️ Eliminar Owner"
        echo -e "${YELLOW}6)${RESET} ↩ Volver"
        echo

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

create_env() {

    local repo="$1"
    local bot_token="$2"
    local owner_id="$3"
    local cloudflare_token="$4"
    local cloudflare_zone="$5"

    cat > "$ENV_FILE" <<EOF
BOT_TOKEN=$bot_token
OWNER_ID=$owner_id
FIREBASE_CREDENTIALS=firebase-admin.json
CLOUDFLARE_TOKEN=$cloudflare_token
CLOUDFLARE_ZONE_ID=$cloudflare_zone
OWNERS_FILE=$OWNERS_FILE
EOF

    chmod 600 "$ENV_FILE"

}

# ============================================================
# FIREBASE
# ============================================================

configure_firebase() {

    cd "$INSTALL_DIR" ||
        die "No se pudo entrar al proyecto."

    if [[ "$SILENT" == "1" ]]; then

        if [[ -f "$FIREBASE_CONFIG" ]]; then

            cp "$FIREBASE_CONFIG" \
                "$INSTALL_DIR/firebase-admin.json"

            chmod 600 \
                "$INSTALL_DIR/firebase-admin.json"

            success "Firebase restaurado."

        else

            warning "No se encontró Firebase para instalación silenciosa."

        fi

        return

    fi

    echo
    echo -e "${YELLOW}╔══════════════════════════════════════════════════╗${RESET}"
    echo -e "${YELLOW}║              FIREBASE ADMIN SDK                 ║${RESET}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════╝${RESET}"
    echo
    echo "Pega el JSON completo."
    echo "Cuando termines presiona CTRL+D."
    echo

    cat > "$INSTALL_DIR/firebase-admin.json"

    if [[ ! -s "$INSTALL_DIR/firebase-admin.json" ]]; then

        error "El archivo Firebase está vacío."
        return 1

    fi

    cp "$INSTALL_DIR/firebase-admin.json" \
        "$FIREBASE_CONFIG"

    chmod 600 \
        "$INSTALL_DIR/firebase-admin.json"

    chmod 600 \
        "$FIREBASE_CONFIG"

    success "Firebase guardado."

}

# ============================================================
# OWNER PRINCIPAL
# ============================================================

ensure_main_owner() {

    create_owners_file

    local owner="$1"

    if [[ -z "$owner" ]]; then
        return
    fi

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
            return
        }

        mv "$OWNERS_FILE.tmp" "$OWNERS_FILE"

        chmod 600 "$OWNERS_FILE"

        success "Owner principal registrado como ilimitado."

    fi

}

# ============================================================
# CONFIGURAR PROYECTO
# ============================================================

configure_project() {

    section "⚙️ CONFIGURACIÓN DEL PROYECTO"

    local repo=""
    local bot_token=""
    local owner_id=""
    local cloudflare_token=""
    local cloudflare_zone=""

    if [[ "$SILENT" == "1" ]]; then

        repo="${REPO:-}"
        bot_token="${BOT_TOKEN:-}"
        owner_id="${OWNER_ID:-}"
        cloudflare_token="${CLOUDFLARE_TOKEN:-}"
        cloudflare_zone="${CLOUDFLARE_ZONE_ID:-}"

        [[ -n "$repo" ]] ||
            die "Modo silencioso: falta REPO."

        [[ -n "$bot_token" ]] ||
            die "Modo silencioso: falta BOT_TOKEN."

        [[ -n "$owner_id" ]] ||
            die "Modo silencioso: falta OWNER_ID."

        [[ -n "$cloudflare_token" ]] ||
            die "Modo silencioso: falta CLOUDFLARE_TOKEN."

        [[ -n "$cloudflare_zone" ]] ||
            die "Modo silencioso: falta CLOUDFLARE_ZONE_ID."

    else

        read -r -p \
            "URL GitHub: " \
            repo

        [[ -n "$repo" ]] ||
            die "Repositorio vacío."

        bot_token="$(
            read_secret "Token del Bot"
        )"

        [[ -n "$bot_token" ]] ||
            die "Token vacío."

        read -r -p \
            "ID Owner Principal: " \
            owner_id

        [[ "$owner_id" =~ ^[0-9]+$ ]] ||
            die "OWNER_ID inválido."

        cloudflare_token="$(
            read_secret "Cloudflare API Token"
        )"

        [[ -n "$cloudflare_token" ]] ||
            die "Cloudflare Token vacío."

        read -r -p \
            "Cloudflare Zone ID: " \
            cloudflare_zone

        [[ -n "$cloudflare_zone" ]] ||
            die "Zone ID vacío."

    fi

    backup_config

    info "Descargando proyecto..."

    rm -rf "$INSTALL_DIR"

    git clone "$repo" "$INSTALL_DIR" \
        >/dev/null 2>&1 ||
        die "No se pudo clonar el repositorio."

    create_env \
        "$repo" \
        "$bot_token" \
        "$owner_id" \
        "$cloudflare_token" \
        "$cloudflare_zone"

    configure_firebase

    ensure_main_owner "$owner_id"

    install_project

}

# ============================================================
# INSTALAR PROYECTO
# ============================================================

install_project() {

    cd "$INSTALL_DIR" ||
        die "No se pudo entrar al proyecto."

    [[ -f package.json ]] ||
        die "No se encontró package.json."

    info "Instalando dependencias..."

    if [[ -f package-lock.json ]]; then

        npm ci --omit=dev >/dev/null 2>&1 ||
        npm install --omit=dev >/dev/null 2>&1 ||
        die "Error instalando dependencias."

    else

        npm install --omit=dev >/dev/null 2>&1 ||
            die "Error instalando dependencias."

    fi

    success "Dependencias instaladas."

    start_bot

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

    info "Iniciando bot con PM2..."

    pm2 delete "$PM2_NAME" \
        >/dev/null 2>&1 || true

    pm2 start index.js \
        --name "$PM2_NAME" \
        --time \
        >/dev/null 2>&1 ||
        die "No se pudo iniciar el bot."

    configure_pm2_startup

    sleep 2

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

    backup_config

    cd "$INSTALL_DIR" ||
        die "No se pudo entrar al proyecto."

    info "Descargando cambios desde GitHub..."

    git fetch --all >/dev/null 2>&1 ||
        die "git fetch falló."

    local branch=""

    branch="$(git symbolic-ref \
        --short HEAD 2>/dev/null || true)"

    if [[ -n "$branch" ]]; then

        git reset --hard "origin/$branch" \
            >/dev/null 2>&1 ||
            git pull >/dev/null 2>&1 ||
            die "No se pudo actualizar el proyecto."

    else

        git pull >/dev/null 2>&1 ||
            die "No se pudo actualizar el proyecto."

    fi

    # Restaurar ENV
    local latest_env=""

    latest_env="$(
        ls -1t \
            "$BACKUP_DIR"/env_*.backup \
            2>/dev/null |
        head -n1
    )"

    if [[ -n "$latest_env" ]]; then

        cp "$latest_env" "$ENV_FILE"
        chmod 600 "$ENV_FILE"

    fi

    # Restaurar Firebase
    if [[ -f "$FIREBASE_CONFIG" ]]; then

        cp "$FIREBASE_CONFIG" \
            "$INSTALL_DIR/firebase-admin.json"

        chmod 600 \
            "$INSTALL_DIR/firebase-admin.json"

    fi

    install_project

    success "Actualización completada."

}

# ============================================================
# REINICIAR
# ============================================================

restart_bot() {

    info "Reiniciando bot..."

    pm2 restart "$PM2_NAME" \
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
                '.[] | select(.name == $name) | .pm2_env.status' |
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

    local new_token

    new_token="$(
        read_secret "Nuevo Token"
    )"

    [[ -n "$new_token" ]] ||
        die "Token vacío."

    backup_config

    sed -i \
        "s|^BOT_TOKEN=.*|BOT_TOKEN=$new_token|" \
        "$ENV_FILE"

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

    local new_owner

    read -r -p \
        "Nuevo OWNER_ID: " \
        new_owner

    [[ "$new_owner" =~ ^[0-9]+$ ]] ||
        die "OWNER_ID inválido."

    backup_config

    sed -i \
        "s|^OWNER_ID=.*|OWNER_ID=$new_owner|" \
        "$ENV_FILE"

    ensure_main_owner "$new_owner"

    chmod 600 "$ENV_FILE"

    restart_bot

    success "Owner principal actualizado."

}

# ============================================================
# CAMBIAR FIREBASE
# ============================================================

change_firebase() {

    [[ -d "$INSTALL_DIR" ]] ||
        die "El bot no está instalado."

    section "🔥 FIREBASE"

    backup_config

    echo "Pega el nuevo JSON Firebase."
    echo "Finaliza con CTRL+D."
    echo

    cat > "$INSTALL_DIR/firebase-admin.json"

    if [[ ! -s "$INSTALL_DIR/firebase-admin.json" ]]; then

        error "Firebase está vacío."
        return

    fi

    cp \
        "$INSTALL_DIR/firebase-admin.json" \
        "$FIREBASE_CONFIG"

    chmod 600 \
        "$INSTALL_DIR/firebase-admin.json"

    chmod 600 \
        "$FIREBASE_CONFIG"

    restart_bot

    success "Firebase actualizado."

}

# ============================================================
# CLOUDFLARE
# ============================================================

change_cloudflare() {

    [[ -f "$ENV_FILE" ]] ||
        die "No existe .env."

    section "☁️ CLOUDFLARE"

    local token
    local zone

    token="$(
        read_secret "Nuevo Cloudflare API Token"
    )"

    read -r -p \
        "Nuevo Zone ID: " \
        zone

    [[ -n "$token" ]] ||
        die "Token vacío."

    [[ -n "$zone" ]] ||
        die "Zone ID vacío."

    backup_config

    sed -i \
        "s|^CLOUDFLARE_TOKEN=.*|CLOUDFLARE_TOKEN=$token|" \
        "$ENV_FILE"

    sed -i \
        "s|^CLOUDFLARE_ZONE_ID=.*|CLOUDFLARE_ZONE_ID=$zone|" \
        "$ENV_FILE"

    chmod 600 "$ENV_FILE"

    restart_bot

    success "Cloudflare actualizado."

}

# ============================================================
# BACKUP MANUAL
# ============================================================

manual_backup() {

    section "💾 BACKUP"

    backup_config

    echo
    echo -e "${GREEN}Backups disponibles:${RESET}"
    echo

    ls -lah "$BACKUP_DIR" 2>/dev/null || true

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
#
# Ejemplo:
#
# REPO="..." \
# BOT_TOKEN="..." \
# OWNER_ID="123" \
# CLOUDFLARE_TOKEN="..." \
# CLOUDFLARE_ZONE_ID="..." \
# bash install.sh --silent
#
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

}

# ============================================================
# MENÚ PRINCIPAL
# ============================================================

menu() {

    while true; do

        banner

        echo -e "${WHITE}╔══════════════════════════════════════════════════════════╗${RESET}"
        echo -e "${WHITE}║${CYAN}              KEVINTECH CONTROL CENTER                  ${WHITE}║${RESET}"
        echo -e "${WHITE}╚══════════════════════════════════════════════════════════╝${RESET}"
        echo

        echo -e "${GREEN}01${RESET}  🚀 Instalar / Actualizar Bot"
        echo -e "${GREEN}02${RESET}  🔄 Reiniciar Bot"
        echo -e "${GREEN}03${RESET}  📊 Estado del Bot"
        echo -e "${GREEN}04${RESET}  📜 Ver Logs"
        echo -e "${GREEN}05${RESET}  🧹 Limpiar Logs"
        echo -e "${GREEN}06${RESET}  🔑 Cambiar Token"
        echo -e "${GREEN}07${RESET}  👑 Cambiar Owner Principal"
        echo -e "${GREEN}08${RESET}  👥 Gestionar Owners"
        echo -e "${GREEN}09${RESET}  🔥 Cambiar Firebase"
        echo -e "${GREEN}10${RESET}  ☁️  Configurar Cloudflare"
        echo -e "${GREEN}11${RESET}  💾 Backup"
        echo -e "${RED}12${RESET}  🗑️  Desinstalar Bot"
        echo -e "${YELLOW}13${RESET}  🚪 Salir"
        echo

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
                change_firebase
                pause
                ;;

            10)
                change_cloudflare
                pause
                ;;

            11)
                manual_backup
                pause
                ;;

            12)
                uninstall_bot
                pause
                ;;

            13)
                clear
                echo -e "${CYAN}KevinTech Multi Script Bot${RESET}"
                echo -e "${GREEN}Hasta pronto.${RESET}"
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
# MAIN
# ============================================================

main() {

    check_root
    create_directories

    if [[ "$1" == "--silent" || "$SILENT" == "1" ]]; then

        silent_install

    else

        menu

    fi

}

main "$@"