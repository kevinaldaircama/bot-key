# KevinTech Bot — SQLite + License API + systemd

## VPS del BOT

La base SQLite está en:

`/opt/kevintech-bot/data/bot.db`

La API escucha solo localmente:

`127.0.0.1:8787`

El servicio systemd arranca bot y API juntos.

### Configurar

```bash
cd /opt/kevintech-bot
cp .env.example .env
nano .env
```

Genera la clave:

```bash
openssl rand -hex 32
```

Colócala en:

```env
LICENSE_API_KEY=...
```

La misma clave será usada por tu `install.sh`.

### Instalar systemd

```bash
./setup-systemd.sh
```

### Comprobar

```bash
systemctl status kevintech-bot
journalctl -u kevintech-bot -f
```

## API pública

No expongas directamente el puerto 8787.

Usa Nginx/Caddy/Cloudflare Tunnel u otro proxy HTTPS:

`https://licencias.tudominio.com`

-> `http://127.0.0.1:8787`

## VPS cliente

Tu `install.sh` consulta:

`GET /api/keys/:key`

y registra:

`POST /api/activations`

La Key queda marcada como usada y permanece en SQLite para historial.

## Importante

Esta migración no borra Firebase ni importa automáticamente los datos existentes.
Si quieres conservar las Keys/usuarios actuales de Firebase, primero hay que hacer una migración Firebase -> SQLite.
