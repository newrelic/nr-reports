#!/bin/bash

source $(dirname "$0")/vars.sh

if [ "$1" == "full" ]; then
    echo "Downloading New Relic Lambda Extension layer..."
    LAYER_URL=$(aws lambda get-layer-version-by-arn --arn arn:aws:lambda:$AWS_REGION:451483290750:layer:$NEW_RELIC_LAYER_NAME:$NEW_RELIC_LAYER_VER --query Content.Location --output text)
    cd $AWS_DIR && \
        curl $LAYER_URL -o layer.zip && \
        rm -rf tmp && \
        mkdir tmp && \
        cd tmp && \
        unzip ../layer.zip && \
        tar zvcf ../newrelic-lambda-extension-layer.tgz . && \
        cd .. && \
        rm -rf tmp && \
        rm layer.zip
fi

echo "Building image..."
cd $ROOT_DIR && \
    docker build -f $ROOT_DIR/nr-reports-lambda/Dockerfile \
    --build-arg AWS_LAMBDA_VER=$AWS_LAMBDA_VER \
    --progress plain \
    -t $PACKAGE_NAME:$ECR_IMAGE_TAG \
    --platform=linux/amd64 \
    $ROOT_DIR
