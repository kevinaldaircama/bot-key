#!/bin/bash

# ============================================================
#        KEVINTECH MULTI SCRIPT VPN BOT INSTALLER v3
# ============================================================
# Autor: Kevin Aldair
# Ubuntu 20.04 / 22.04 / 24.04
#
# Funciones:
# - Instalar / actualizar
# - Multi-owner
# - Owners por días
# - Owners ilimitados
# - Renovar owners
# - Eliminar owners
# - Backups
# - Limpieza de logs
# - Instalación silenciosa
# - PM2 persistente
# - Firebase
# - Cloudflare
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

NODE_VERSION="22"

LOG_DAYS=7

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
# LOG
# ============================================================

log() {

    mkdir -p "$LOG_DIR"

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$INSTALL_LOG"

}

info() {

    log "$*"

    [[ "$SILENT" == "1" ]] && return

    echo -e "${BLUE}[*]${NC} $*"

}

success() {

    log "$*"

    [[ "$SILENT" == "1" ]] && return

    echo -e "${GREEN}[✓]${NC} $*"

}

warning() {

    log "WARNING: $*"

    [[ "$SILENT" == "1" ]] && return

    echo -e "${YELLOW}[!]${NC} $*"

}

error() {

    log "ERROR: $*"

    echo -e "${RED}[✗]${NC} $*" >&2

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
    echo "╔══════════════════════════════════════════════════╗"
    echo "║                                                  ║"
    echo "║          KEVINTECH MULTI SCRIPT BOT             ║"
    echo "║                 INSTALLER v3                    ║"
    echo "║                                                  ║"
    echo "║       MULTI OWNER • EXPIRACIÓN • PM2            ║"
    echo "║                                                  ║"
    echo "╚══════════════════════════════════════════════════╝"
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
# SISTEMA
# ============================================================

check_os() {

    [[ -f /etc/os-release ]] ||
        die "No se encontró /etc/os-release."

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

    chmod 700 "$CONFIG_DIR"
    chmod 700 "$BACKUP_DIR"

    touch "$INSTALL_LOG"

    chmod 600 "$INSTALL_LOG"

}

# ============================================================
# LIMPIAR LOGS
# ============================================================

clean_old_logs() {

    info "Limpiando logs antiguos..."

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

    success "Logs antiguos eliminados."

}

# ============================================================
# PAQUETES
# ============================================================

install_packages() {

    info "Actualizando repositorios..."

    export DEBIAN_FRONTEND=noninteractive

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
# NODE
# ============================================================

install_node() {

    if command -v node >/dev/null 2>&1; then

        CURRENT=$(node -v | sed 's/v//' | cut -d. -f1)

        if [[ "$CURRENT" -ge "$NODE_VERSION" ]]; then

            success "Node.js $(node -v) ya está instalado."

            return

        fi

    fi

    info "Instalando Node.js $NODE_VERSION..."

    curl -fsSL \
        "https://deb.nodesource.com/setup_${NODE_VERSION}.x" \
        | bash - >/dev/null 2>&1 ||
        die "No se pudo configurar Node.js."

    apt-get install -y nodejs >/dev/null 2>&1 ||
        die "No se pudo instalar Node.js."

    success "Node.js $(node -v) instalado."

}

# ============================================================
# PM2
# ============================================================

install_pm2() {

    if command -v pm2 >/dev/null 2>&1; then

        success "PM2 ya está instalado."

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

    local TEXT="$1"

    local VALUE

    read -r -s -p "$TEXT: " VALUE

    echo

    echo "$VALUE"

}

# ============================================================
# BACKUP
# ============================================================

backup_config() {

    mkdir -p "$BACKUP_DIR"

    DATE=$(date '+%Y%m%d_%H%M%S')

    if [[ -f "$ENV_FILE" ]]; then

        cp "$ENV_FILE" \
            "$BACKUP_DIR/env_$DATE.backup"

        chmod 600 \
            "$BACKUP_DIR/env_$DATE.backup"

    fi

    if [[ -f "$INSTALL_DIR/firebase-admin.json" ]]; then

        cp "$INSTALL_DIR/firebase-admin.json" \
            "$BACKUP_DIR/firebase_$DATE.json"

        chmod 600 \
            "$BACKUP_DIR/firebase_$DATE.json"

    fi

    if [[ -f "$OWNERS_FILE" ]]; then

        cp "$OWNERS_FILE" \
            "$BACKUP_DIR/owners_$DATE.json"

        chmod 600 \
            "$BACKUP_DIR/owners_$DATE.json"

    fi

    # Mantener los últimos 30 archivos
    ls -1t "$BACKUP_DIR"/* 2>/dev/null |
        tail -n +31 |
        xargs -r rm -f

    success "Backup realizado."

}

# ============================================================
# CREAR OWNERS
# ============================================================

create_owners_file() {

    if [[ ! -f "$OWNERS_FILE" ]]; then

        cat > "$OWNERS_FILE" <<EOF
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

    echo
    echo "=============================================="
    echo "             AGREGAR OWNER"
    echo "=============================================="
    echo
    echo "1) 1 día"
    echo "2) 7 días"
    echo "3) 15 días"
    echo "4) 30 días"
    echo "5) 60 días"
    echo "6) 90 días"
    echo "7) 180 días"
    echo "8) 365 días"
    echo "9) Ilimitado"
    echo

    read -r -p "ID Telegram: " ID

    if [[ ! "$ID" =~ ^[0-9]+$ ]]; then

        error "El ID debe ser numérico."

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

    read -r -p "Duración: " TYPE

    case "$TYPE" in

        1|7|15|30|60|90|180|365)

            CREATED=$(date '+%Y-%m-%d')

            EXPIRES=$(date \
                -d "+$TYPE days" \
                '+%Y-%m-%d')

            jq \
                --arg id "$ID" \
                --arg name "$NAME" \
                --arg created "$CREATED" \
                --arg expires "$EXPIRES" \
                --arg days "$TYPE" \
                '.owners += [{
                    "id": $id,
                    "name": $name,
                    "type": "temporary",
                    "days": ($days | tonumber),
                    "created": $created,
                    "expires": $expires,
                    "status": "active"
                }]' \
                "$OWNERS_FILE" \
                > "$OWNERS_FILE.tmp"

            ;;

        9)

            CREATED=$(date '+%Y-%m-%d')

            jq \
                --arg id "$ID" \
                --arg name "$NAME" \
                --arg created "$CREATED" \
                '.owners += [{
                    "id": $id,
                    "name": $name,
                    "type": "unlimited",
                    "days": null,
                    "created": $created,
                    "expires": null,
                    "status": "active"
                }]' \
                "$OWNERS_FILE" \
                > "$OWNERS_FILE.tmp"

            ;;

        *)

            error "Duración inválida."

            return

            ;;

    esac

    mv "$OWNERS_FILE.tmp" "$OWNERS_FILE"

    chmod 600 "$OWNERS_FILE"

    success "Owner agregado."

    if [[ "$TYPE" == "9" ]]; then

        echo -e "${GREEN}Duración: ILIMITADO${NC}"

    else

        echo -e "${GREEN}Vencimiento: $EXPIRES${NC}"

    fi

}

# ============================================================
# LISTAR OWNERS
# ============================================================

list_owners() {

    create_owners_file

    echo
    echo "=============================================="
    echo "                 OWNERS"
    echo "=============================================="
    echo

    jq -r '
    .owners[] |
    "ID       : \(.id)
Nombre   : \(.name)
Tipo     : \(.type)
Creado   : \(.created)
Vence    : \(.expires // "ILIMITADO")
Estado   : \(.status)
----------------------------------------------"
    ' "$OWNERS_FILE"

}

# ============================================================
# ACTUALIZAR EXPIRACIONES
# ============================================================

update_expirations() {

    create_owners_file

    TODAY=$(date '+%Y-%m-%d')

    jq \
        --arg today "$TODAY" \
        '
        .owners |= map(
            if .expires != null and .expires < $today
            then .status = "expired"
            else .status = "active"
            end
        )
        ' \
        "$OWNERS_FILE" \
        > "$OWNERS_FILE.tmp"

    mv "$OWNERS_FILE.tmp" "$OWNERS_FILE"

    chmod 600 "$OWNERS_FILE"

    success "Expiraciones actualizadas."

}

# ============================================================
# RENOVAR OWNER
# ============================================================

renew_owner() {

    create_owners_file

    read -r -p "ID del owner: " ID

    if ! jq -e \
        --arg id "$ID" \
        '.owners[] | select(.id == $id)' \
        "$OWNERS_FILE" >/dev/null 2>&1; then

        error "Owner no encontrado."

        return

    fi

    echo
    echo "1) 7 días"
    echo "2) 15 días"
    echo "3) 30 días"
    echo "4) 60 días"
    echo "5) 90 días"
    echo "6) 180 días"
    echo "7) 365 días"
    echo "8) Ilimitado"
    echo

    read -r -p "Nueva duración: " DAYS

    case "$DAYS" in

        7|15|30|60|90|180|365)

            EXPIRES=$(date \
                -d "+$DAYS days" \
                '+%Y-%m-%d')

            jq \
                --arg id "$ID" \
                --arg expires "$EXPIRES" \
                --arg days "$DAYS" \
                '.owners |= map(
                    if .id == $id then
                        .type = "temporary" |
                        .days = ($days | tonumber) |
                        .expires = $expires |
                        .status = "active"
                    else .
                    end
                )' \
                "$OWNERS_FILE" \
                > "$OWNERS_FILE.tmp"

            ;;

        8)

            jq \
                --arg id "$ID" \
                '.owners |= map(
                    if .id == $id then
                        .type = "unlimited" |
                        .days = null |
                        .expires = null |
                        .status = "active"
                    else .
                    end
                )' \
                "$OWNERS_FILE" \
                > "$OWNERS_FILE.tmp"

            ;;

        *)

            error "Duración inválida."

            return

            ;;

    esac

    mv "$OWNERS_FILE.tmp" "$OWNERS_FILE"

    chmod 600 "$OWNERS_FILE"

    success "Owner renovado."

}

# ============================================================
# ELIMINAR OWNER
# ============================================================

remove_owner() {

    create_owners_file

    read -r -p "ID del owner a eliminar: " ID

    if ! jq -e \
        --arg id "$ID" \
        '.owners[] | select(.id == $id)' \
        "$OWNERS_FILE" >/dev/null 2>&1; then

        error "Owner no encontrado."

        return

    fi

    jq \
        --arg id "$ID" \
        '.owners |= map(select(.id != $id))' \
        "$OWNERS_FILE" \
        > "$OWNERS_FILE.tmp"

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

        echo "=============================================="
        echo "              GESTIÓN DE OWNERS"
        echo "=============================================="
        echo
        echo "1) Agregar Owner"
        echo "2) Listar Owners"
        echo "3) Renovar Owner"
        echo "4) Actualizar expiraciones"
        echo "5) Eliminar Owner"
        echo "6) Volver"
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
# CONFIGURAR PROYECTO
# ============================================================

configure_project() {

    banner

    echo
    echo -e "${BLUE}Configurando proyecto...${NC}"
    echo

    if [[ "$SILENT" == "1" ]]; then

        [[ -n "$REPO" ]] ||
            die "REPO no definido."

        [[ -n "$BOT_TOKEN" ]] ||
            die "BOT_TOKEN no definido."

        [[ -n "$OWNER_ID" ]] ||
            die "OWNER_ID no definido."

        [[ -n "$CLOUDFLARE_TOKEN" ]] ||
            die "CLOUDFLARE_TOKEN no definido."

        [[ -n "$CLOUDFLARE_ZONE_ID" ]] ||
            die "CLOUDFLARE_ZONE_ID no definido."

    else

        read -r -p \
            "GitHub (https://github.com/usuario/repositorio.git): " \
            REPO

        while [[ -z "$REPO" ]]; do

            read -r -p "GitHub: " REPO

        done

        BOT_TOKEN=$(read_secret "Token del Bot")

        while [[ -z "$BOT_TOKEN" ]]; do

            BOT_TOKEN=$(read_secret "Token del Bot")

        done

        read -r -p "ID del Dueño Principal: " OWNER_ID

        while [[ -z "$OWNER_ID" ]]; do

            read -r -p "ID del Dueño: " OWNER_ID

        done

        CLOUDFLARE_TOKEN=$(read_secret \
            "Cloudflare API Token")

        while [[ -z "$CLOUDFLARE_TOKEN" ]]; do

            CLOUDFLARE_TOKEN=$(read_secret \
                "Cloudflare API Token")

        done

        read -r -p \
            "Cloudflare Zone ID: " \
            CLOUDFLARE_ZONE_ID

        while [[ -z "$CLOUDFLARE_ZONE_ID" ]]; do

            read -r -p \
                "Cloudflare Zone ID: " \
                CLOUDFLARE_ZONE_ID

        done

    fi

    backup_config

    if [[ -d "$INSTALL_DIR/.git" ]]; then

        update_bot

        return

    fi

    info "Descargando proyecto..."

    rm -rf "$INSTALL_DIR"

    git clone "$REPO" "$INSTALL_DIR" \
        >/dev/null 2>&1 ||
        die "No se pudo clonar el repositorio."

    cd "$INSTALL_DIR" ||
        die "No se pudo entrar al proyecto."

    # ========================================================
    # FIREBASE
    # ========================================================

    if [[ "$SILENT" == "1" ]]; then

        if [[ -f "$CONFIG_DIR/firebase-admin.json" ]]; then

            cp \
                "$CONFIG_DIR/firebase-admin.json" \
                "$INSTALL_DIR/firebase-admin.json"

        else

            warning "Firebase no encontrado."

        fi

    else

        echo
        echo -e "${YELLOW}"
        echo "Pega el JSON completo de Firebase Admin SDK."
        echo "Cuando termines presiona CTRL+D."
        echo -e "${NC}"

        cat > firebase-admin.json

    fi

    # ========================================================
    # ENV
    # ========================================================

    cat > "$ENV_FILE" <<EOF
BOT_TOKEN=$BOT_TOKEN
OWNER_ID=$OWNER_ID
FIREBASE_CREDENTIALS=firebase-admin.json
CLOUDFLARE_TOKEN=$CLOUDFLARE_TOKEN
CLOUDFLARE_ZONE_ID=$CLOUDFLARE_ZONE_ID
OWNERS_FILE=$OWNERS_FILE
EOF

    chmod 600 "$ENV_FILE"

    if [[ -f "$INSTALL_DIR/firebase-admin.json" ]]; then

        cp \
            "$INSTALL_DIR/firebase-admin.json" \
            "$CONFIG_DIR/firebase-admin.json"

        chmod 600 \
            "$INSTALL_DIR/firebase-admin.json"

        chmod 600 \
            "$CONFIG_DIR/firebase-admin.json"

    fi

    create_owners_file

    # Owner principal ilimitado
    if ! jq -e \
        --arg id "$OWNER_ID" \
        '.owners[] | select(.id == $id)' \
        "$OWNERS_FILE" >/dev/null 2>&1; then

        jq \
            --arg id "$OWNER_ID" \
            '.owners += [{
                "id": $id,
                "name": "Owner Principal",
                "type": "unlimited",
                "days": null,
                "created": (now | strftime("%Y-%m-%d")),
                "expires": null,
                "status": "active"
            }]' \
            "$OWNERS_FILE" \
            > "$OWNERS_FILE.tmp"

        mv "$OWNERS_FILE.tmp" "$OWNERS_FILE"

    fi

    chmod 600 "$OWNERS_FILE"

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
# INICIAR BOT
# ============================================================

start_bot() {

    cd "$INSTALL_DIR" || return 1

    [[ -f index.js ]] ||
        die "No se encontró index.js."

    info "Iniciando bot..."

    pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true

    pm2 start index.js \
        --name "$PM2_NAME" \
        --time \
        >/dev/null 2>&1 ||
        die "No se pudo iniciar el bot."

    pm2 save >/dev/null 2>&1

    pm2 startup systemd \
        -u root \
        --hp /root \
        >/tmp/pm2startup.txt 2>&1 || true

    STARTUP=$(grep '^sudo ' \
        /tmp/pm2startup.txt \
        | head -n1)

    if [[ -n "$STARTUP" ]]; then

        eval "${STARTUP#sudo }" \
            >/dev/null 2>&1 || true

    fi

    pm2 save >/dev/null 2>&1

    sleep 2

    if pm2 describe "$PM2_NAME" \
        >/dev/null 2>&1; then

        success "Bot iniciado correctamente."

    else

        die "PM2 no pudo iniciar el bot."

    fi

}

# ============================================================
# ACTUALIZAR BOT
# ============================================================

update_bot() {

    [[ -d "$INSTALL_DIR/.git" ]] ||
        die "El bot no está instalado."

    info "Creando backup..."

    backup_config

    cd "$INSTALL_DIR" || return

    info "Actualizando código..."

    git fetch --all >/dev/null 2>&1 ||
        die "Error ejecutando git fetch."

    git reset --hard origin/HEAD \
        >/dev/null 2>&1 ||
        git pull >/dev/null 2>&1 ||
        die "No se pudo actualizar."

    # Restaurar último ENV
    LATEST_ENV=$(ls -1t \
        "$BACKUP_DIR"/env_*.backup \
        2>/dev/null | head -n1)

    if [[ -n "$LATEST_ENV" ]]; then

        cp "$LATEST_ENV" "$ENV_FILE"

        chmod 600 "$ENV_FILE"

    fi

    # Restaurar Firebase
    if [[ -f "$CONFIG_DIR/firebase-admin.json" ]]; then

        cp \
            "$CONFIG_DIR/firebase-admin.json" \
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

    success "Bot reiniciado."

}

# ============================================================
# ESTADO
# ============================================================

status_bot() {

    echo

    pm2 status "$PM2_NAME"

    echo

    if pm2 describe "$PM2_NAME" \
        >/dev/null 2>&1; then

        success "El bot está registrado en PM2."

    else

        error "El bot no está registrado."

    fi

}

# ============================================================
# LOGS
# ============================================================

show_logs() {

    pm2 logs "$PM2_NAME"

}

# ============================================================
# LIMPIAR LOGS
# ============================================================

clear_logs() {

    echo

    read -r -p \
        "¿Eliminar logs antiguos de más de $LOG_DAYS días? [s/n]: " \
        CONFIRM

    [[ "$CONFIRM" == "s" ]] || return

    clean_old_logs

    # Vaciar logs actuales de PM2
    pm2 flush >/dev/null 2>&1 || true

    success "Logs limpiados."

}

# ============================================================
# CAMBIAR TOKEN
# ============================================================

change_token() {

    [[ -f "$ENV_FILE" ]] ||
        die "No existe .env."

    NEW_TOKEN=$(read_secret "Nuevo Token")

    [[ -n "$NEW_TOKEN" ]] ||
        die "Token vacío."

    sed -i \
        "s|^BOT_TOKEN=.*|BOT_TOKEN=$NEW_TOKEN|" \
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

    read -r -p "Nuevo OWNER_ID: " NEW_OWNER

    [[ "$NEW_OWNER" =~ ^[0-9]+$ ]] ||
        die "OWNER_ID inválido."

    sed -i \
        "s|^OWNER_ID=.*|OWNER_ID=$NEW_OWNER|" \
        "$ENV_FILE"

    chmod 600 "$ENV_FILE"

    restart_bot

    success "Owner principal actualizado."

}

# ============================================================
# FIREBASE
# ============================================================

change_firebase() {

    echo
    echo "Pega el nuevo JSON Firebase."
    echo "Finaliza con CTRL+D."
    echo

    cat > "$INSTALL_DIR/firebase-admin.json"

    cp \
        "$INSTALL_DIR/firebase-admin.json" \
        "$CONFIG_DIR/firebase-admin.json"

    chmod 600 \
        "$INSTALL_DIR/firebase-admin.json"

    chmod 600 \
        "$CONFIG_DIR/firebase-admin.json"

    restart_bot

    success "Firebase actualizado."

}

# ============================================================
# CLOUDFLARE
# ============================================================

change_cloudflare() {

    [[ -f "$ENV_FILE" ]] ||
        die "No existe .env."

    TOKEN=$(read_secret \
        "Nuevo Cloudflare API Token")

    read -r -p \
        "Nuevo Zone ID: " \
        ZONE

    [[ -n "$TOKEN" ]] ||
        die "Token vacío."

    [[ -n "$ZONE" ]] ||
        die "Zone ID vacío."

    sed -i \
        "s|^CLOUDFLARE_TOKEN=.*|CLOUDFLARE_TOKEN=$TOKEN|" \
        "$ENV_FILE"

    sed -i \
        "s|^CLOUDFLARE_ZONE_ID=.*|CLOUDFLARE_ZONE_ID=$ZONE|" \
        "$ENV_FILE"

    chmod 600 "$ENV_FILE"

    restart_bot

    success "Cloudflare actualizado."

}

# ============================================================
# DESINSTALAR
# ============================================================

uninstall_bot() {

    echo

    read -r -p \
        "¿Seguro que deseas eliminar el bot? [s/n]: " \
        CONFIRM

    [[ "$CONFIRM" == "s" ]] || return

    # Backup final antes de borrar
    backup_config

    pm2 stop "$PM2_NAME" \
        >/dev/null 2>&1 || true

    pm2 delete "$PM2_NAME" \
        >/dev/null 2>&1 || true

    rm -rf "$INSTALL_DIR"

    success "Bot eliminado."

    echo
    echo "Los backups permanecen en:"
    echo "$BACKUP_DIR"

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

    success "Instalación silenciosa completada."

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

        echo
        echo "1) Instalar / Actualizar Bot"
        echo "2) Reiniciar Bot"
        echo "3) Estado del Bot"
        echo "4) Ver Logs"
        echo "5) Limpiar Logs"
        echo "6) Cambiar Token"
        echo "7) Cambiar Owner Principal"
        echo "8) Gestionar Owners"
        echo "9) Cambiar Firebase"
        echo "10) Configurar Cloudflare"
        echo "11) Backup"
        echo "12) Desinstalar Bot"
        echo "13) Salir"
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
                backup_config
                pause
                ;;

            12)
                uninstall_bot
                pause
                ;;

            13)
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