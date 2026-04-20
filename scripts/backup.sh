#!/bin/bash

# Configuration
PROJECT_ROOT="/Users/etikahsiregar/Development/Partner-Team-Onboarding-Web"
BACKUP_DIR="$PROJECT_ROOT/backups"
UPLOADS_DIR="$PROJECT_ROOT/public/uploads"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
RETENTION_DAYS=30

# Docker/DB Configuration (Matching docker-compose.yml)
DB_CONTAINER="onboarding-db"
DB_USER="root"
DB_PASS="rootpassword"
DB_NAME="db_onboarding"

# 1. Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Starting backup process..."

# 2. Backup Database
echo "Backing up database..."
docker exec "$DB_CONTAINER" mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
    echo "Database backup successful: db_backup_$TIMESTAMP.sql"
else
    echo "ERROR: Database backup failed!"
fi

# 3. Backup Uploads Folder
echo "Backing up media files..."
# We use tar to compress the uploads folder
tar -czf "$BACKUP_DIR/files_backup_$TIMESTAMP.tar.gz" -C "$PROJECT_ROOT" public/uploads

if [ $? -eq 0 ]; then
    echo "Media backup successful: files_backup_$TIMESTAMP.tar.gz"
else
    echo "ERROR: Media backup failed!"
fi

# 4. Cleanup old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +$RETENTION_DAYS -exec rm {} \;
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -exec rm {} \;

echo "[$TIMESTAMP] Backup process completed."
