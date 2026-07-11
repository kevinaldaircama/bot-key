#!/bin/bash

# ==========================================
# MULTI SCRIPT VPN BOT INSTALLER
# Parte 1
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
INSTALL_DIR="/opt/multi-script-bot"
PM2_NAME="multiscriptbot"

banner() {
clear
echo -e "${CYAN}"
echo "================================================="
echo "             MULTI SCRIPT VPN BOT"
echo "================================================="
echo -e "${NC}"
}

pause(){
read -p "Presiona ENTER para continuar..."
}

check_root(){

if [[ $EUID -ne 0 ]]; then
echo -e "${RED}Este instalador debe ejecutarse como root.${NC}"
exit 1
fi

}

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
build-essential

}

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

install_pm2(){

if command -v pm2 >/dev/null 2>&1; then

echo -e "${GREEN}PM2 ya instalado.${NC}"

else

echo
echo -e "${BLUE}Instalando PM2...${NC}"

npm install -g pm2

fi

pm2 -v

}

menu(){

banner

echo "1) Instalar Bot"
echo "2) Actualizar Bot"
echo "3) Reiniciar Bot"
echo "4) Ver Logs"
echo "5) Cambiar Token"
echo "6) Cambiar Owner ID"
echo "7) Cambiar Firebase"
echo "8) Desinstalar Bot"
echo "9) Salir"

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
configure_project
install_project

;;

2)

update_bot

;;

3)

restart_bot

;;

4)

show_logs

;;

5)

change_token

;;

6)

change_owner

;;

7)

change_firebase

;;

8)

uninstall_bot

;;

9)

exit

;;

*)

echo "Opción inválida"
sleep 2

;;

esac

pause
menu

}
# ==========================================
# PARTE 2A
# Configuración automática
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
echo -e "${YELLOW}Ahora pega el JSON completo de Firebase Admin SDK.${NC}"
echo -e "${YELLOW}Cuando termines presiona CTRL+D${NC}"
echo

echo
echo -e "${BLUE}Descargando proyecto...${NC}"

rm -rf "$INSTALL_DIR"

git clone "$REPO" "$INSTALL_DIR"

cd "$INSTALL_DIR" || exit

echo
echo -e "${YELLOW}Pegue ahora el JSON completo de Firebase.${NC}"
echo "Finalice con CTRL+D"

cat > firebase-admin.json

echo -e "${GREEN}Firebase guardado correctamente.${NC}"

echo
echo -e "${BLUE}Creando archivo .env...${NC}"

cat > .env <<EOF
BOT_TOKEN=$BOT_TOKEN
OWNER_ID=$OWNER_ID
FIREBASE_CREDENTIALS=firebase-admin.json
EOF

echo -e "${GREEN}.env creado correctamente.${NC}"

install_project

}
# ==========================================
# PARTE 2B
# Instalación automática del proyecto
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

echo
echo -e "${BLUE}Iniciando el bot...${NC}"

pm2 delete $PM2_NAME >/dev/null 2>&1

pm2 start index.js \
--name "$PM2_NAME"

pm2 save

pm2 startup systemd -u root --hp /root >/tmp/pm2startup.txt

bash <(grep "sudo" /tmp/pm2startup.txt | sed 's/sudo //')

echo
echo -e "${GREEN}Bot iniciado correctamente.${NC}"

pm2 status

}
# ==========================================
# PARTE 3
# Actualizar, Reiniciar y Desinstalar
# ==========================================

update_bot() {

echo
echo -e "${BLUE}Actualizando bot...${NC}"

if [ ! -d "$INSTALL_DIR/.git" ]; then
    echo -e "${RED}El bot no está instalado.${NC}"
    return
fi

cd "$INSTALL_DIR" || return

cp .env /tmp/multiscript.env

if [ -f firebase-admin.json ]; then
    cp firebase-admin.json /tmp/firebase-admin.json
fi

git reset --hard
git pull

npm install

cp /tmp/multiscript.env .env

if [ -f /tmp/firebase-admin.json ]; then
    cp /tmp/firebase-admin.json firebase-admin.json
fi

pm2 restart $PM2_NAME

echo
echo -e "${GREEN}Actualización completada.${NC}"

}

restart_bot() {

echo
echo -e "${BLUE}Reiniciando bot...${NC}"

pm2 restart $PM2_NAME

echo -e "${GREEN}Bot reiniciado correctamente.${NC}"

}

show_logs() {

pm2 logs $PM2_NAME

}

change_token() {

if [ ! -f "$INSTALL_DIR/.env" ]; then
    echo -e "${RED}No existe .env${NC}"
    return
fi

read -p "Nuevo Token: " NEW_TOKEN

sed -i "s|^BOT_TOKEN=.*|BOT_TOKEN=$NEW_TOKEN|" "$INSTALL_DIR/.env"

pm2 restart $PM2_NAME

echo -e "${GREEN}Token actualizado.${NC}"

}

change_owner() {

if [ ! -f "$INSTALL_DIR/.env" ]; then
    echo -e "${RED}No existe .env${NC}"
    return
fi

read -p "Nuevo OWNER_ID: " NEW_OWNER

sed -i "s|^OWNER_ID=.*|OWNER_ID=$NEW_OWNER|" "$INSTALL_DIR/.env"

pm2 restart $PM2_NAME

echo -e "${GREEN}Owner actualizado.${NC}"

}

change_firebase() {

echo
echo "Pegue el nuevo JSON Firebase."
echo "Finalice con CTRL+D"

cat > "$INSTALL_DIR/firebase-admin.json"

pm2 restart $PM2_NAME

echo -e "${GREEN}Firebase actualizado.${NC}"

}

uninstall_bot() {

echo
read -p "¿Seguro que desea eliminar el bot? [s/n]: " CONFIRM

if [[ "$CONFIRM" != "s" ]]; then
    return
fi

pm2 stop $PM2_NAME >/dev/null 2>&1
pm2 delete $PM2_NAME >/dev/null 2>&1

rm -rf "$INSTALL_DIR"

echo -e "${GREEN}Bot eliminado correctamente.${NC}"

}
menu
