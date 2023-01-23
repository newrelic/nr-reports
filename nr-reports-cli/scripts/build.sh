#!/bin/bash

source $(dirname "$0")/vars.sh

if [ -z "$IMAGE_REPO" ]; then
  IMAGE_REPO="nr-reports"
fi

echo "Building CLI image..."
cd $ROOT_DIR && \
    docker build -f $ROOT_DIR/nr-reports-cli/Dockerfile \
        --progress plain \
        -t $IMAGE_REPO:$IMAGE_TAG \
        $ROOT_DIR
