#!/bin/bash

source $(dirname "$0")/vars.sh

if [ -z "$CRON_ENTRY" ]; then
  CRON_ENTRY="00   *   *   *   *"
fi

if [ -z "$IMAGE_REPO" ]; then
  IMAGE_REPO="nr-reports-cron"
fi

echo "Building CRON image..."
cd $ROOT_DIR && \
    docker build -f $ROOT_DIR/nr-reports-cli/Dockerfile-cron \
        --build-arg CRON_ENTRY="$CRON_ENTRY" \
        --progress plain \
        -t $IMAGE_REPO:$IMAGE_TAG \
        $ROOT_DIR
