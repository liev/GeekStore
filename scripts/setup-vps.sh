#!/bin/bash
# -----------------------------------------------------------------------------
# 🚀 GoblinSpot VPS Setup Script (Ubuntu 22.04 / 24.04)
# -----------------------------------------------------------------------------
# EJECUCIÓN: sudo bash scripts/setup-vps.sh
# -----------------------------------------------------------------------------

set -e

echo "🧌 Iniciando Setup del Servidor para GoblinSpot..."

# 1. Actualizar sistema
echo "[1/6] Actualizando sistema operativo..."
apt update && apt upgrade -y

# 2. Instalar Docker y Docker Compose
echo "[2/6] Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker instalado correctamente."
else
    echo "Docker ya está instalado."
fi

# 3. Mover la carpeta actual al directorio /opt y dar permisos
echo "[3/6] Preparando directorio /opt/goblinspot..."
if [ ! -d "/opt/goblinspot" ]; then
    mkdir -p /opt/goblinspot
    cp -r * /opt/goblinspot/ 2>/dev/null || true
    echo "Archivos copiados a /opt/goblinspot"
fi

# 4. Instalar y Configurar Nginx
echo "[4/6] Configurando Nginx Reverse Proxy..."
apt install nginx -y

# Verificar si existe nuestra configuración exportada
if [ -f "/opt/goblinspot/deploy/nginx/goblinspot.conf" ]; then
    cp /opt/goblinspot/deploy/nginx/goblinspot.conf /etc/nginx/sites-available/goblinspot
    ln -sf /etc/nginx/sites-available/goblinspot /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Validar y reiniciar Nginx
    nginx -t && systemctl restart nginx
    echo "Nginx configurado exitosamente."
else
    echo "⚠️ ADVERTENCIA: No se encontró deploy/nginx/goblinspot.conf"
fi

# 5. Firewall
echo "[5/6] Configurando Firewall (UFW)..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 6. Preparar entorno para levantar contenedores
echo "[6/6] Despliegue de Docker..."
cd /opt/goblinspot

if [ ! -f ".env" ]; then
    if [ -f ".env.prod" ]; then
        cp .env.prod .env
        echo "✅ Archivo .env creado basado en .env.prod"
    else
        echo "❌ ERROR: No se encontró .env.prod. ¡Cópialo antes de continuar!"
    fi
fi

echo "=========================================================================="
echo "🎉 SETUP COMPLETADO."
echo "Para levantar el servidor, asegúrate de que el archivo /opt/goblinspot/.env"
echo "tenga tus credenciales finales (Gemini, SMTP, Cloudinary, PayPal) y ejecuta:"
echo ""
echo "    cd /opt/goblinspot"
echo "    docker compose up -d --build"
echo "=========================================================================="
