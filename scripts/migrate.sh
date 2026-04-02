#!/bin/bash
# ==================================================
# GoblinSpot — Migración a otro VPS
# Tiempo estimado: 30 minutos
#
# USO: ./migrate.sh backup   → Crear backup
#      ./migrate.sh restore  → Restaurar en nuevo servidor
# ==================================================

set -euo pipefail

BACKUP_DIR="/opt/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="goblinspot-db"
DB_USER="${POSTGRES_USER:-geekstore}"
DB_NAME="${POSTGRES_DB:-geekstore}"

backup() {
    echo "══════════════════════════════════════════"
    echo "  GoblinSpot — Creando backup completo"
    echo "══════════════════════════════════════════"

    mkdir -p "$BACKUP_DIR"

    echo ""
    echo "→ [1/3] Dump de PostgreSQL..."
    docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" \
        | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
    echo "  ✓ $BACKUP_DIR/db_${TIMESTAMP}.sql.gz"

    echo ""
    echo "→ [2/3] Exportando volumen de datos..."
    docker run --rm \
        -v geekstore_pgdata:/data \
        -v "$BACKUP_DIR":/backup \
        alpine tar czf "/backup/pgdata_${TIMESTAMP}.tar.gz" -C /data .
    echo "  ✓ $BACKUP_DIR/pgdata_${TIMESTAMP}.tar.gz"

    echo ""
    echo "→ [3/3] Archivos a copiar al nuevo servidor:"
    echo ""
    echo "  scp $BACKUP_DIR/db_${TIMESTAMP}.sql.gz     nuevo-server:/opt/backups/"
    echo "  scp /opt/goblinspot/.env                    nuevo-server:/opt/goblinspot/"
    echo "  scp -r /etc/ssl/cloudflare/                 nuevo-server:/etc/ssl/cloudflare/"
    echo "  scp /etc/nginx/sites-available/goblinspot   nuevo-server:/etc/nginx/sites-available/"
    echo ""
    echo "══════════════════════════════════════════"
    echo "  Backup completado: $TIMESTAMP"
    echo "══════════════════════════════════════════"
}

restore() {
    echo "══════════════════════════════════════════"
    echo "  GoblinSpot — Restaurando en nuevo VPS"
    echo "══════════════════════════════════════════"

    if [ -z "${1:-}" ]; then
        echo "USO: ./migrate.sh restore <archivo_backup.sql.gz>"
        echo "Ejemplo: ./migrate.sh restore /opt/backups/db_20260402.sql.gz"
        exit 1
    fi

    BACKUP_FILE="$1"

    echo ""
    echo "→ [1/4] Levantando containers..."
    docker compose up -d --build

    echo ""
    echo "→ [2/4] Esperando que PostgreSQL esté listo..."
    sleep 10

    echo ""
    echo "→ [3/4] Restaurando backup..."
    gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" "$DB_NAME"
    echo "  ✓ Base de datos restaurada"

    echo ""
    echo "→ [4/4] Verificando..."
    curl -sf http://localhost:5242/health && echo "  ✓ API respondiendo" || echo "  ✗ API no responde"

    echo ""
    echo "══════════════════════════════════════════"
    echo "  PENDIENTE: Actualizar IP en Cloudflare"
    echo "  Dashboard → goblinspot.com → DNS"
    echo "  Cambiar A records a la nueva IP"
    echo "══════════════════════════════════════════"
}

case "${1:-}" in
    backup)  backup ;;
    restore) restore "${2:-}" ;;
    *)
        echo "USO: ./migrate.sh [backup|restore]"
        echo ""
        echo "  backup   Crear backup de DB y volumen"
        echo "  restore  Restaurar DB desde backup"
        exit 1
        ;;
esac
