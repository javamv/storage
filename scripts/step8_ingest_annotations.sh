#!/bin/bash

# Define variables
FILE_PATH="scripts/data/alpha-project---bmp_13m.mp4.zip"
BUCKET_NAME="l2-prep"
SUBDIRECTORY="annotations"
TARGET_PATH="${BUCKET_NAME}/${SUBDIRECTORY}/alpha-project---bmp_13m.mp4.zip"
CHECK_PATH="myminio/l4-dl/alpha-project/bmp_13m.mp4/annotations/default.json"
TIMEOUT=30
INTERVAL=2

# Upload the file to MinIO
mc cp "$FILE_PATH" "myminio/$TARGET_PATH"

# Check if the upload was successful
if [ $? -ne 0 ]; then
  echo "Error uploading file."
  exit 1
fi

echo "File successfully uploaded to ${TARGET_PATH}."

# Wait for default.json to appear
echo "Checking for default.json in ${CHECK_PATH}..."
SECONDS_ELAPSED=0
while [ $SECONDS_ELAPSED -lt $TIMEOUT ]; do
  if mc stat "$CHECK_PATH" >/dev/null 2>&1; then
    echo "default.json is present."
    exit 0
  fi
  sleep $INTERVAL
  SECONDS_ELAPSED=$((SECONDS_ELAPSED + INTERVAL))
done

# If we reach here, the file was not found within the timeout period
echo "default.json not found in ${CHECK_PATH} after ${TIMEOUT} seconds."
exit 1