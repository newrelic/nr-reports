#!/bin/bash

source $(dirname "$0")/vars.sh

AWS_ACCESS_KEY_ID=$(aws configure get aws_access_key_id)
AWS_SECRET_ACCESS_KEY=$(aws configure get aws_secret_access_key)
ENV_ARGS=$(npm run --silent params-to-env-args)
TMP_DIR=$(mktemp -d)

echo "Created temp dir: $TMP_DIR"

bash -c "docker run -a stdout -t --name lambda --rm \
    -p 9000:8080 \
    -v $TMP_DIR:/tmp \
    -e AWS_REGION=\"$AWS_REGION\" \
    -e AWS_ACCESS_KEY_ID=\"$AWS_ACCESS_KEY_ID\" \
    -e AWS_SECRET_ACCESS_KEY=\"$AWS_SECRET_ACCESS_KEY\" \
    -e NEW_RELIC_EXTENSION_LOG_LEVEL=DEBUG \
    -e NEW_RELIC_LOG_SERVER_HOST=localhost \
    -e NEW_RELIC_LAMBDA_HANDLER=nr-reports-lambda/lambda.handler \
    $ENV_ARGS \
    -e LOG_LEVEL=DEBUG \
    $PACKAGE_NAME:$ECR_IMAGE_TAG | tr -s \"\r\" \"\n\""

if [ "$TMP_DIR" != "" -a "$TMP_DIR" != "/" -a "$TMP_DIR" != '.' -a "$TMP_DIR" != '..' -a -d $TMP_DIR ]; then
    rm -rf $TMP_DIR
    echo "Removed temp dir: $TMP_DIR"
fi
