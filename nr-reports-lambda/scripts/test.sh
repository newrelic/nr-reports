#!/bin/bash

function handle_option {
  case "$1" in
    --include-dir)
      if [ -n "$2" ]; then
        INCLUDE_DIR=$2
        return 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
  esac

  return 0
}

source $(dirname "$0")/vars.sh

read -a ENV_ARGS <<<$(npm run --silent params-to-env-args)
TMP_DIR=$(mktemp -d)

echo "Created temp dir: $TMP_DIR"

if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    AWS_ACCESS_KEY_ID=$(aws configure get aws_access_key_id)
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    AWS_SECRET_ACCESS_KEY=$(aws configure get aws_secret_access_key)
fi

if [ -n INCLUDE_DIR ]; then
    ENV_ARGS+=('-v' "$INCLUDE_DIR:/var/task/include")
fi

docker run -a stdout -t --name lambda --rm \
    -p 9000:8080 \
    -v $TMP_DIR:/tmp \
    -e AWS_REGION=$AWS_REGION \
    -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
    -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
    -e NEW_RELIC_LOG_SERVER_HOST=localhost \
    -e NEW_RELIC_LAMBDA_HANDLER=nr-reports-lambda/lambda.handler \
    --platform=linux/amd64 \
    "${ENV_ARGS[@]}" \
    $PACKAGE_NAME:$ECR_IMAGE_TAG | tr -s "\r" "\n"

if [ "$TMP_DIR" != "" -a "$TMP_DIR" != "/" -a "$TMP_DIR" != '.' -a "$TMP_DIR" != '..' -a -d $TMP_DIR ]; then
    rm -rf $TMP_DIR
    echo "Removed temp dir: $TMP_DIR"
fi
