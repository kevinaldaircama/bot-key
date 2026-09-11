# KevinTech Multi Script Bot

## Instalación automática

Ejecuta `install.sh` como root.

En una instalación nueva, el instalador solicita:
- URL del repositorio GitHub
- Token del bot de Telegram
- ID del Owner principal
- Dominio público de License API
- Token y Zone ID de Cloudflare (opcionales)

Después realiza automáticamente la instalación de dependencias, Node.js, PM2, Nginx, Certbot, SQLite, el proyecto, la License API y el proxy del dominio.

La URL queda guardada en `.env` como `LICENSE_API_URL` y el dominio en `/etc/kevintech/multiscript/api-domain`.

Si se puede emitir el certificado, configura HTTPS automáticamente. Si el dominio todavía no apunta al VPS, la instalación no se detiene y deja la API disponible por HTTP para no romper el servicio.

## Actualizaciones

Si el bot ya está instalado, `install.sh` conserva el dominio de la License API y la configuración existente. No vuelve a pedir el dominio salvo que no exista una configuración previa.

La base SQLite y `.env` se respaldan antes de actualizar.

## Cloudflare

La opción de configuración de Cloudflare ahora solo guarda el nuevo Token/Zone ID y reinicia el bot. No hace una consulta de validación a Cloudflare, tal como requiere el flujo del instalador.

## License API

La API escucha únicamente en `127.0.0.1:8787`. Nginx publica el dominio configurado y reenvía las peticiones a la API.

Endpoints principales:
- `/health`
- `/api/keys/:key`
- `/api/activations`
- `/api/public/validate`
- `/api/public/activate`
- `/api/status`

## Historial

El historial del bot combina:
- `history/<chatId>` para dominios
- `keyHistory` para Key Free

Muestra los últimos 15 eventos y acepta registros antiguos que usen `createdAt` en lugar de `time`.

No es necesario editar `history.js` manualmente.
