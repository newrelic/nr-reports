#!/bin/bash

source $(dirname "$0")/vars.sh

echo "Building image..."
cd $ROOT_DIR && \
    docker build -f $ROOT_DIR/nr-storybook-cli/Dockerfile \
        --build-arg MANIFEST_FILE=$MANIFEST_FILE \
        --build-arg TEMPLATE_DIR=$TEMPLATE_DIR \
        --build-arg CRON_ENTRY="$CRON_ENTRY" \
        --progress plain \
        -t $IMAGE_REPO:$IMAGE_TAG \
        $ROOT_DIR
