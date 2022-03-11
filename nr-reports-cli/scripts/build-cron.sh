#!/bin/bash

source $(dirname "$0")/vars.sh

if [ -z "$MANIFEST_FILE" ]; then
  MANIFEST_FILE="manifest.json"
fi

if [ -z "$CRON_ENTRY" ]; then
  CRON_ENTRY="00   *   *   *   *"
fi

if [ -z "$IMAGE_REPO" ]; then
  IMAGE_REPO="nr-reports-cron"
fi

echo "Building image..."
cd $ROOT_DIR && \
    docker build -f $ROOT_DIR/nr-reports-cli/Dockerfile-cron \
        --build-arg MANIFEST_FILE=$MANIFEST_FILE \
        --build-arg TEMPLATE_DIR=$TEMPLATE_DIR \
        --build-arg CRON_ENTRY="$CRON_ENTRY" \
        --progress plain \
        -t $IMAGE_REPO:$IMAGE_TAG \
        $ROOT_DIR
