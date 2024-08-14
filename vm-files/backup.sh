#!/bin/bash

# Define variables
BACKUP_DIR="/home/minecraft"
SCREEN_SESSION="mcs"
BUCKET_NAME="gs://{projectId}.appspot.com"
DATE=$(date "+%Y-%m-%d_%H:00")
BUCKET_PATH="backup/$DATE.tar.gz"

echo "Starting backup script at $(date)"

# Check if the screen session is running
if screen -list | grep -q "$SCREEN_SESSION"; then
    echo "Screen session '$SCREEN_SESSION' is running. Saving game state."
    # Save the game and turn off saving
    screen -S "$SCREEN_SESSION" -X stuff '/save-all\n'
    screen -S "$SCREEN_SESSION" -X stuff '/save-off\n'
else
    echo "Screen session '$SCREEN_SESSION' not found. Proceeding with backup without saving game state."
fi

# Change to the backup directory
echo "Changing directory to $BACKUP_DIR"
cd "$BACKUP_DIR" || { echo "Failed to change directory to $BACKUP_DIR"; exit 1; }

# Backup all world folders to Google Cloud Storage using tar and streaming to gsutil
echo "Creating tarball of directories matching $BACKUP_DIR/world*"
echo "Uploading to $BUCKET_NAME/$BUCKET_PATH"
tar -czf - world* | /usr/bin/gsutil cp - "$BUCKET_NAME/$BUCKET_PATH"

if [ $? -eq 0 ]; then
    echo "Backup successfully uploaded to $BUCKET_NAME/$BUCKET_PATH"
else
    echo "Backup failed"
    exit 1
fi

# Check if the screen session is running again to turn saving back on
if screen -list | grep -q "$SCREEN_SESSION"; then
    echo "Screen session '$SCREEN_SESSION' is running. Turning saving back on."
    # Turn saving back on if the screen session is running
    screen -S "$SCREEN_SESSION" -X stuff '/save-on\n'
else
    echo "Screen session '$SCREEN_SESSION' not found. Backup completed without turning save back on."
fi

echo "Backup script completed at $(date)"
echo "Backup location: $GCS_BUCKET/$BACKUP_NAME"