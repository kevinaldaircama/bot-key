#!/bin/bash

# ==========================================
# MULTI SCRIPT VPN BOT INSTALLER
# Autor: Kevin Aldair
# ==========================================

clear

RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
CYAN='\033[1;36m'
NC='\033[0m'

BOT_NAME="Multi Script VPN Bot"

# ==========================================
# RUTAS
# ==========================================

INSTALL_DIR="/opt/multi-script-bot"

PM2_NAME="multiscriptbot"

# SNiff / EHI
SNIFF_DIR="$INSTALL_DIR/sniff"
SNIFF_VENV="$SNIFF_DIR/venv"
SNIFF_SERVICE="multiscript-sniff"

# ==========================================
# BANNER
# ==========================================

banner() {

clear

echo -e "${CYAN}"
echo "================================================="
echo "             MULTI SCRIPT VPN BOT"
echo "================================================="
echo -e "${NC}"

}

# ==========================================
# PAUSA
# ==========================================

pause(){

read -p "Presiona ENTER para continuar..."

}

# ==========================================
# ROOT
# ==========================================

check_root(){

if [[ $EUID -ne 0 ]]; then

echo -e "${RED}Este instalador debe ejecutarse como root.${NC}"

exit 1

fi

}

# ==========================================
# SISTEMA OPERATIVO
# ==========================================

check_os(){

if [ ! -f /etc/os-release ]; then

echo -e "${RED}Sistema no compatible.${NC}"

exit 1

fi

source /etc/os-release

if [[ "$ID" != "ubuntu" ]]; then

echo -e "${RED}Solo Ubuntu es compatible.${NC}"

exit 1

fi

VERSION=$VERSION_ID

case $VERSION in

18.04|20.04|22.04|24.04)
;;

*)

echo -e "${RED}Ubuntu $VERSION no soportado.${NC}"

exit 1

;;

esac

echo -e "${GREEN}Ubuntu $VERSION detectado.${NC}"

}

# ==========================================
# PAQUETES
# ==========================================

install_packages(){

echo

echo -e "${BLUE}Actualizando sistema...${NC}"

apt update -y
apt upgrade -y

echo

echo -e "${BLUE}Instalando dependencias...${NC}"

apt install -y \
curl \
wget \
git \
nano \
unzip \
zip \
jq \
software-properties-common \
build-essential \
python3 \
python3-pip \
python3-venv

}

# ==========================================
# NODE.JS
# ==========================================

install_node(){

if command -v node >/dev/null 2>&1; then

echo -e "${GREEN}Node.js ya instalado.${NC}"

node -v

else

echo
echo -e "${BLUE}Instalando Node.js 22...${NC}"

curl -fsSL https://deb.nodesource.com/setup_22.x | bash -

apt install -y nodejs

fi

echo -e "${GREEN}Versión Node:${NC} $(node -v)"
echo -e "${GREEN}Versión NPM:${NC} $(npm -v)"

}

# ==========================================
# PM2
# ==========================================

install_pm2(){

if command -v pm2 >/dev/null 2>&1; then

echo -e "${GREEN}PM2 ya instalado.${NC}"

else

echo
echo -e "${BLUE}Instalando PM2...${NC}"

npm install -g pm2

fi

echo -e "${GREEN}Versión PM2:${NC}"

pm2 -v

}

# ==========================================
# INSTALAR / ACTUALIZAR SNIFF
# ==========================================

install_sniff(){

echo
echo "================================================="
echo "             INSTALANDO SNIFF EHI"
echo "================================================="
echo

if [ ! -d "$SNIFF_DIR" ]; then

echo -e "${RED}No existe el directorio:${NC}"
echo "$SNIFF_DIR"

return 1

fi

cd "$SNIFF_DIR" || return 1

# ------------------------------------------
# Comprobar archivos
# ------------------------------------------

if [ ! -f "bot.py" ]; then

echo -e "${RED}No se encontró bot.py${NC}"

return 1

fi

if [ ! -f "ehi_decryptor.py" ]; then

echo -e "${RED}No se encontró ehi_decryptor.py${NC}"

return 1

fi

if [ ! -f "requirements.txt" ]; then

echo -e "${RED}No se encontró requirements.txt${NC}"

return 1

fi

# ------------------------------------------
# Crear VENV
# ------------------------------------------

echo -e "${BLUE}Creando entorno virtual Python...${NC}"

if [ ! -d "$SNIFF_VENV" ]; then

python3 -m venv "$SNIFF_VENV"

if [ $? -ne 0 ]; then

echo -e "${RED}No se pudo crear el entorno virtual.${NC}"

return 1

fi

fi

# ------------------------------------------
# Actualizar pip
# ------------------------------------------

echo
echo -e "${BLUE}Preparando pip...${NC}"

"$SNIFF_VENV/bin/python" -m pip install --upgrade pip

# ------------------------------------------
# Dependencias
# ------------------------------------------

echo
echo -e "${BLUE}Instalando dependencias de Sniff...${NC}"

"$SNIFF_VENV/bin/python" -m pip install -r requirements.txt

if [ $? -ne 0 ]; then

echo -e "${RED}Error instalando dependencias de Sniff.${NC}"

return 1

fi

echo -e "${GREEN}Dependencias de Sniff instaladas.${NC}"

# ------------------------------------------
# Comprobar módulo
# ------------------------------------------

echo
echo -e "${BLUE}Comprobando EHI Decryptor...${NC}"

"$SNIFF_VENV/bin/python" -c \
"from ehi_decryptor import run; print('EHI OK')"

if [ $? -ne 0 ]; then

echo -e "${RED}Error cargando ehi_decryptor.${NC}"

return 1

fi

echo -e "${GREEN}EHI Decryptor funcionando.${NC}"

# ------------------------------------------
# Servicio systemd
# ------------------------------------------

echo
echo -e "${BLUE}Creando servicio Sniff...${NC}"

cat > "/etc/systemd/system/$SNIFF_SERVICE.service" <<EOF
[Unit]
Description=Multi Script EHI Sniff Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple

WorkingDirectory=$SNIFF_DIR

EnvironmentFile=$INSTALL_DIR/.env

ExecStart=$SNIFF_VENV/bin/python $SNIFF_DIR/bot.py

Restart=always
RestartSec=5

User=root

[Install]
WantedBy=multi-user.target
EOF

# ------------------------------------------
# Activar servicio
# ------------------------------------------

systemctl daemon-reload

systemctl enable "$SNIFF_SERVICE"

systemctl restart "$SNIFF_SERVICE"

sleep 2

# ------------------------------------------
# Estado
# ------------------------------------------

if systemctl is-active --quiet "$SNIFF_SERVICE"; then

echo
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   SNIFF EHI INICIADO CORRECTAMENTE${NC}"
echo -e "${GREEN}=========================================${NC}"

else

echo
echo -e "${RED}Sniff no pudo iniciar.${NC}"

echo
echo "Últimos logs:"
echo

journalctl -u "$SNIFF_SERVICE" -n 20 --no-pager

return 1

fi

}

# ==========================================
# CONFIGURAR PROYECTO
# ==========================================

configure_project() {

echo
echo -e "${BLUE}Configurando proyecto...${NC}"
echo

read -p "GitHub (https://github.com/usuario/repositorio.git): " REPO

while [[ -z "$REPO" ]]; do

echo -e "${RED}El repositorio no puede estar vacío.${NC}"

read -p "GitHub: " REPO

done

read -p "Token del Bot: " BOT_TOKEN

while [[ -z "$BOT_TOKEN" ]]; do

echo -e "${RED}El token es obligatorio.${NC}"

read -p "Token del Bot: " BOT_TOKEN

done

read -p "ID del Dueño: " OWNER_ID

while [[ -z "$OWNER_ID" ]]; do

echo -e "${RED}El ID es obligatorio.${NC}"

read -p "ID del Dueño: " OWNER_ID

done

echo

read -p "Cloudflare API Token: " CLOUDFLARE_TOKEN

while [[ -z "$CLOUDFLARE_TOKEN" ]]; do

echo -e "${RED}El Cloudflare Token es obligatorio.${NC}"

read -p "Cloudflare API Token: " CLOUDFLARE_TOKEN

done

echo

read -p "Cloudflare Zone ID: " CLOUDFLARE_ZONE_ID

while [[ -z "$CLOUDFLARE_ZONE_ID" ]]; do

echo -e "${RED}La Zone ID es obligatoria.${NC}"

read -p "Cloudflare Zone ID: " CLOUDFLARE_ZONE_ID

done

# ==========================================
# DESCARGAR PROYECTO
# ==========================================

echo
echo -e "${BLUE}Descargando proyecto...${NC}"

rm -rf "$INSTALL_DIR"

git clone "$REPO" "$INSTALL_DIR"

if [ $? -ne 0 ]; then

echo -e "${RED}No se pudo clonar el repositorio.${NC}"

exit 1

fi

cd "$INSTALL_DIR" || exit 1

# ==========================================
# FIREBASE
# ==========================================

echo
echo -e "${YELLOW}Pegue ahora el JSON completo de Firebase Admin SDK.${NC}"
echo -e "${YELLOW}Cuando termine presione CTRL+D${NC}"
echo

cat > firebase-admin.json

echo
echo -e "${GREEN}Firebase guardado correctamente.${NC}"

# ==========================================
# .ENV
# ==========================================

echo
echo -e "${BLUE}Creando archivo .env...${NC}"

cat > .env <<EOF
BOT_TOKEN=$BOT_TOKEN
OWNER_ID=$OWNER_ID
FIREBASE_CREDENTIALS=firebase-admin.json

CLOUDFLARE_TOKEN=$CLOUDFLARE_TOKEN
CLOUDFLARE_ZONE_ID=$CLOUDFLARE_ZONE_ID
EOF

chmod 600 .env
chmod 600 firebase-admin.json

echo -e "${GREEN}.env creado correctamente.${NC}"

# ==========================================
# INSTALAR PROYECTO
# ==========================================

install_project

}

# ==========================================
# INSTALAR PROYECTO NODE
# ==========================================

install_project() {

echo
echo -e "${BLUE}Instalando dependencias del proyecto...${NC}"

cd "$INSTALL_DIR" || exit 1

if [ ! -f package.json ]; then

echo -e "${RED}No se encontró package.json${NC}"

exit 1

fi

npm install

if [ $? -ne 0 ]; then

echo -e "${RED}Error al instalar dependencias.${NC}"

exit 1

fi

echo -e "${GREEN}Dependencias instaladas.${NC}"

# ==========================================
# BOT NODE
# ==========================================

echo
echo -e "${BLUE}Iniciando bot principal...${NC}"

pm2 delete "$PM2_NAME" >/dev/null 2>&1

pm2 start index.js \
--name "$PM2_NAME"

pm2 save

pm2 startup systemd -u root --hp /root >/tmp/pm2startup.txt 2>&1

STARTUP_CMD=$(grep -E '^sudo ' /tmp/pm2startup.txt | head -n 1)

if [[ -n "$STARTUP_CMD" ]]; then

eval "${STARTUP_CMD#sudo }"

fi

echo
echo -e "${GREEN}Bot principal iniciado correctamente.${NC}"

pm2 status

# ==========================================
# SNIFF EHI
# ==========================================

install_sniff

}

# ==========================================
# ACTUALIZAR BOT
# ==========================================

update_bot() {

echo
echo -e "${BLUE}Actualizando bot...${NC}"

if [ ! -d "$INSTALL_DIR/.git" ]; then

echo -e "${RED}El bot no está instalado.${NC}"

return

fi

cd "$INSTALL_DIR" || return

# ==========================================
# RESPALDAR CONFIGURACIÓN
# ==========================================

if [ -f .env ]; then

cp .env /tmp/multiscript.env

fi

if [ -f firebase-admin.json ]; then

cp firebase-admin.json /tmp/firebase-admin.json

fi

# ==========================================
# ACTUALIZAR GIT
# ==========================================

git reset --hard

git pull

# ==========================================
# RESTAURAR CONFIGURACIÓN
# ==========================================

if [ -f /tmp/multiscript.env ]; then

cp /tmp/multiscript.env .env

fi

if [ -f /tmp/firebase-admin.json ]; then

cp /tmp/firebase-admin.json firebase-admin.json

fi

# ==========================================
# NODE
# ==========================================

npm install

# ==========================================
# REINICIAR NODE
# ==========================================

pm2 restart "$PM2_NAME"

# ==========================================
# SNIFF
# ==========================================

install_sniff

echo
echo -e "${GREEN}Actualización completada.${NC}"

}

# ==========================================
# REINICIAR BOT
# ==========================================

restart_bot() {

echo
echo -e "${BLUE}Reiniciando bot principal...${NC}"

pm2 restart "$PM2_NAME"

echo -e "${GREEN}Bot principal reiniciado correctamente.${NC}"

echo
echo -e "${BLUE}Reiniciando Sniff EHI...${NC}"

systemctl restart "$SNIFF_SERVICE"

if systemctl is-active --quiet "$SNIFF_SERVICE"; then

echo -e "${GREEN}Sniff EHI reiniciado correctamente.${NC}"

else

echo -e "${RED}Sniff EHI no está funcionando.${NC}"

fi

}

# ==========================================
# LOGS BOT PRINCIPAL
# ==========================================

show_logs() {

pm2 logs "$PM2_NAME"

}

# ==========================================
# LOGS SNIFF
# ==========================================

show_sniff_logs() {

echo
echo "================================================="
echo "             LOGS SNIFF EHI"
echo "================================================="
echo

journalctl -u "$SNIFF_SERVICE" -f

}

# ==========================================
# CAMBIAR TOKEN
# ==========================================

change_token() {

if [ ! -f "$INSTALL_DIR/.env" ]; then

echo -e "${RED}No existe .env${NC}"

return

fi

read -p "Nuevo Token: " NEW_TOKEN

if [[ -z "$NEW_TOKEN" ]]; then

echo -e "${RED}Token vacío.${NC}"

return

fi

sed -i "s|^BOT_TOKEN=.*|BOT_TOKEN=$NEW_TOKEN|" \
"$INSTALL_DIR/.env"

pm2 restart "$PM2_NAME"

systemctl restart "$SNIFF_SERVICE"

echo -e "${GREEN}Token actualizado.${NC}"

}

# ==========================================
# CAMBIAR OWNER
# ==========================================

change_owner() {

if [ ! -f "$INSTALL_DIR/.env" ]; then

echo -e "${RED}No existe .env${NC}"

return

fi

read -p "Nuevo OWNER_ID: " NEW_OWNER

if [[ -z "$NEW_OWNER" ]]; then

echo -e "${RED}OWNER_ID vacío.${NC}"

return

fi

sed -i "s|^OWNER_ID=.*|OWNER_ID=$NEW_OWNER|" \
"$INSTALL_DIR/.env"

pm2 restart "$PM2_NAME"

echo -e "${GREEN}Owner actualizado.${NC}"

}

# ==========================================
# CAMBIAR FIREBASE
# ==========================================

change_firebase() {

echo
echo "Pegue el nuevo JSON Firebase."
echo "Finalice con CTRL+D"
echo

cat > "$INSTALL_DIR/firebase-admin.json"

chmod 600 "$INSTALL_DIR/firebase-admin.json"

pm2 restart "$PM2_NAME"

echo -e "${GREEN}Firebase actualizado.${NC}"

}

# ==========================================
# CAMBIAR CLOUDFLARE
# ==========================================

change_cloudflare() {

if [ ! -f "$INSTALL_DIR/.env" ]; then

echo -e "${RED}No existe .env${NC}"

return

fi

read -p "Nuevo Cloudflare Token: " TOKEN

read -p "Nuevo Zone ID: " ZONE

if [[ -z "$TOKEN" || -z "$ZONE" ]]; then

echo -e "${RED}Los datos no pueden estar vacíos.${NC}"

return

fi

sed -i "s|^CLOUDFLARE_TOKEN=.*|CLOUDFLARE_TOKEN=$TOKEN|" \
"$INSTALL_DIR/.env"

sed -i "s|^CLOUDFLARE_ZONE_ID=.*|CLOUDFLARE_ZONE_ID=$ZONE|" \
"$INSTALL_DIR/.env"

pm2 restart "$PM2_NAME"

echo -e "${GREEN}Cloudflare actualizado correctamente.${NC}"

}

# ==========================================
# DESINSTALAR
# ==========================================

uninstall_bot() {

echo

read -p "¿Seguro que desea eliminar el bot? [s/n]: " CONFIRM

if [[ "$CONFIRM" != "s" ]]; then

return

fi

# ------------------------------------------
# Node
# ------------------------------------------

pm2 stop "$PM2_NAME" >/dev/null 2>&1

pm2 delete "$PM2_NAME" >/dev/null 2>&1

# ------------------------------------------
# Sniff
# ------------------------------------------

systemctl stop "$SNIFF_SERVICE" >/dev/null 2>&1

systemctl disable "$SNIFF_SERVICE" >/dev/null 2>&1

rm -f "/etc/systemd/system/$SNIFF_SERVICE.service"

systemctl daemon-reload

# ------------------------------------------
# Archivos
# ------------------------------------------

rm -rf "$INSTALL_DIR"

pm2 save >/dev/null 2>&1

echo
echo -e "${GREEN}Bot principal y Sniff eliminados correctamente.${NC}"

}

# ==========================================
# MENU
# ==========================================

menu(){

banner

echo "1) Instalar / Actualizar Bot"
echo "2) Reiniciar Bot"
echo "3) Ver Logs Bot"
echo "4) Cambiar Token"
echo "5) Cambiar Owner ID"
echo "6) Cambiar Firebase"
echo "7) Configurar Cloudflare"
echo "8) Ver Logs Sniff EHI"
echo "9) Desinstalar Bot"
echo "10) Salir"

echo

read -p "Seleccione una opción: " OPTION

case $OPTION in

1)

banner

check_root

check_os

install_packages

install_node

install_pm2

if [ -d "$INSTALL_DIR/.git" ]; then

update_bot

else

configure_project

fi

;;

2)

restart_bot

;;

3)

show_logs

;;

4)

change_token

;;

5)

change_owner

;;

6)

change_firebase

;;

7)

change_cloudflare

;;

8)

show_sniff_logs

;;

9)

uninstall_bot

;;

10)

exit

;;

*)

echo -