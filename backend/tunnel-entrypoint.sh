#!/bin/sh
# tunnel-entrypoint.sh – Alzak Flow SSH Tunnel Maestro (Versión Blindada)
set -e

echo "[tunnel] ── Iniciando Puente Alzak Flow ──────────────────"

# 1. Validar que las variables necesarias existan
: "${SSH_USER?ERROR: SSH_USER no definida en el .env}"
: "${SSH_HOST?ERROR: SSH_HOST no definida en el .env}"
: "${SSH_PRIVATE_KEY_B64?ERROR: SSH_PRIVATE_KEY_B64 no definida en el .env}"

# 2. Configurar rutas en /tmp para evitar errores de escritura (Read-only FS)
mkdir -p /tmp/.ssh
chmod 700 /tmp/.ssh
KEY_PATH="/tmp/.ssh/id_ed25519"
CONFIG_PATH="/tmp/.ssh/config"

# 3. Decodificar la llave privada desde el .env
echo "[tunnel] Decodificando llave SSH..."
echo "${SSH_PRIVATE_KEY_B64}" | base64 -d > "${KEY_PATH}"
chmod 600 "${KEY_PATH}"

# 4. Crear archivo de configuración SSH dinámico en /tmp
echo "[tunnel] Configurando parámetros de conexión..."
cat > "${CONFIG_PATH}" <<EOF
Host remote-host
    HostName ${SSH_HOST}
    User ${SSH_USER}
    Port ${SSH_PORT:-22}
    IdentityFile ${KEY_PATH}
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    ServerAliveInterval 15
    ServerAliveCountMax 3
    ExitOnForwardFailure yes
    ConnectTimeout 10
EOF
chmod 600 "${CONFIG_PATH}"

echo "[tunnel] Intentando conectar a: ${SSH_USER}@${SSH_HOST}"
echo "[tunnel] Mapeando puerto local 3306 -> remoto 127.0.0.1:3306"

# 5. Ejecutar autossh usando el archivo de configuración de /tmp
# -F especifica el archivo de configuración personalizado
exec env AUTOSSH_GATETIME=0 AUTOSSH_LOGFILE=/dev/stdout \
    autossh -M 0 -N \
    -F "${CONFIG_PATH}" \
    -L "0.0.0.0:3306:127.0.0.1:3306" \
    remote-host
