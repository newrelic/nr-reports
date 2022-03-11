#!/bin/bash

source $(dirname "$0")/vars.sh

if [ -z "$IMAGE_REPO" ]; then
  IMAGE_REPO="nr-reports"
fi

echo "Building image..."
cd $ROOT_DIR && \
    docker build -f $ROOT_DIR/nr-reports-cli/Dockerfile \
        --build-arg MANIFEST_FILE=$MANIFEST_FILE \
        --build-arg TEMPLATE_DIR=$TEMPLATE_DIR \
        --progress plain \
        -t $IMAGE_REPO:$IMAGE_TAG \
        $ROOT_DIR
