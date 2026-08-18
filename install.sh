#!/bin/bash

# ============================================================
#        KEVINTECH MULTI SCRIPT VPN BOT INSTALLER v2
# ============================================================
# Autor: Kevin Aldair
# Compatible: Ubuntu 20.04 / 22.04 / 24.04
#
# Características:
# - Instalación normal / silenciosa
# - Multi-owner
# - Owners por días
# - Owners ilimitados
# - Backup automático
# - Limpieza de logs
# - PM2 persistente
# - Actualización segura
# - Configuración protegida
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
INSTALL_LOG="$LOG_DIR/installer.log"

PM2_NAME="multiscriptbot"

NODE_MAJOR="22"

# Cantidad de días de logs que conservar
LOG_RETENTION_DAYS=7

# Modo silencioso:
# SILENT=1 ./installer.sh
SILENT="${SILENT:-0}"

# ============================================================
# COLORES
# ============================================================

RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
CYAN='\033[1;36m'
MAGENTA='\033[1;35m'
WHITE='\033[1;37m'
NC='\033[0m'

# ============================================================
# UTILIDADES
# ============================================================

timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log() {
    mkdir -p "$LOG_DIR"
    echo "[$(timestamp)] $*" >> "$INSTALL_LOG"
}

info() {
    log "$*"

    if [[ "$SILENT" != "1" ]]; then
        echo -e "${BLUE}[*]${NC} $*"
    fi
}

success() {
    log "$*"

    if [[ "$SILENT" != "1" ]]; then
        echo -e "${GREEN}[✓]${NC} $*"
    fi
}

warning() {
    log "WARNING: $*"

    if [[ "$SILENT" != "1" ]]; then
        echo -e "${YELLOW}[!]${NC} $*"
    fi
}

error() {
    log "ERROR: $*"
    echo -e "${RED}[✗]${NC} $*" >&2
}

die() {
    error "$*"
    exit 1
}

banner() {

    [[ "$SILENT" == "1" ]] && return

    clear

    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════╗"
    echo "║                                                    ║"
    echo "║          KEVINTECH MULTI SCRIPT BOT               ║"
    echo "║                  INSTALLER v2                      ║"
    echo "║                                                    ║"
    echo "║       Multi Owner • Expiración • PM2              ║"
    echo "║                                                    ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo -e "${NC}"
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
# SISTEMA OPERATIVO
# ============================================================

check_os() {

    [[ -f /etc/os-release ]] || die "No se encontró /etc/os-release."

    source /etc/os-release

    if [[ "$ID" != "ubuntu" ]]; then
        die "Sistema no compatible. Se requiere Ubuntu."
    fi

    case "$VERSION_ID" in
        20.04|22.04|24.04)
            success "Ubuntu $VERSION_ID detectado."
            ;;
        *)
            die "Ubuntu $VERSION_ID no soportado."
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

    chmod 700 "$CONFIG_DIR"
    chmod 700 "$BACKUP_DIR"

    touch "$INSTALL_LOG"
    chmod 600 "$INSTALL_LOG"

}

# ============================================================
# LIMPIAR LOGS ANTIGUOS
# ============================================================

clean_old_logs() {

    info "Limpiando logs antiguos..."

    if [[ -d "$LOG_DIR" ]]; then
        find "$LOG_DIR" \
            -type f \
            -name "*.log" \
            -mtime +"$LOG_RETENTION_DAYS" \
            -delete
    fi

    # Limpiar logs rotados del sistema de PM2
    if [[ -d "/root/.pm2/logs" ]]; then
        find /root/.pm2/logs \
            -type f \
            -mtime +"$LOG_RETENTION_DAYS" \
            -delete 2>/dev/null || true
    fi

    success "