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

echo "4) Desinstalar Bot"

echo "5) Salir"

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

echo
echo -e "${GREEN}Preparando instalación...${NC}"

;;

2)

echo "Actualización disponible en la Parte 3."

;;

3)

pm2 restart $PM2_NAME

;;

4)

echo "Desinstalación disponible en la Parte 3."

;;

5)

exit

;;

*)

echo "Opción inválida."
sleep 2
menu

;;

esac

}

menu
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

mkdir -p "$INSTALL_DIR"

cat > "$INSTALL_DIR/firebase-admin.json"

echo -e "${GREEN}Firebase guardado correctamente.${NC}"

echo
echo -e "${BLUE}Descargando proyecto...${NC}"

if [ -d "$INSTALL_DIR/.git" ]; then
    rm -rf "$INSTALL_DIR"
fi

git clone "$REPO" "$INSTALL_DIR"

cd "$INSTALL_DIR" || exit

echo
echo -e "${BLUE}Creando archivo .env...${NC}"

cat > .env <<EOF
BOT_TOKEN=$BOT_TOKEN
OWNER_ID=$OWNER_ID
FIREBASE_CREDENTIALS=firebase-admin.json
EOF

echo -e "${GREEN}.env creado correctamente.${NC}"

}
