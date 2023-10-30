#!/bin/bash

source $(dirname "$0")/init.sh

FULL=0
BUILD=0
BUILD_TYPE=test
PREFIX=
IMAGE_NAME=

while [ $# -ne 0 ]; do
    case "$1" in
        --full)
            FULL=1; shift;
            ;;
        --build)
            BUILD=1; shift;
            ;;
        --build-type)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then BUILD_TYPE=$1; shift; else err "missing build type with --build-type"; fi
            ;;
        -t)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then IMAGE_NAME=$1; shift; else err "missing image tag with -t"; fi
            ;;
        -p)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then PREFIX=$1; shift; else err "missing prefix with -p";fi
            ;;
        *)
            err "invalid option $1"
            ;;
    esac
done

ORIG_PREFIX=
if [ -n "$PREFIX" ]; then
    ORIG_PREFIX="$PREFIX"
fi

source $(dirname "$0")/vars.sh

if [ -z "$IMAGE_NAME" ]; then
    P_IMAGE_NAME=${PREFIX}IMAGE_NAME
    IMAGE_NAME=${!P_IMAGE_NAME:-$APP_DIR_NAME}
fi

PREFIX_ARG=""
if [ -n "$ORIG_PREFIX" ]; then PREFIX_ARG="-p $ORIG_PREFIX"; fi

FULL_ARG=""
if [ $FULL -eq 1 ]; then FULL_ARG="--full"; fi

if [ $BUILD -eq 1 ]; then
    $SCRIPT_DIR/build.sh -t "$IMAGE_NAME" $FULL_ARG $PREFIX_ARG
fi

if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    AWS_ACCESS_KEY_ID=$(aws configure get aws_access_key_id)
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    AWS_SECRET_ACCESS_KEY=$(aws configure get aws_secret_access_key)
fi

if [ -f "$APP_DIR/deploy/.docker-run.$BUILD_TYPE" ]; then
  read -a DOCKER_RUN_ARGS <<<$(cat $APP_DIR/deploy/.docker-run.$BUILD_TYPE)
fi

if [ -f "$APP_DIR/deploy/.cfenv.$BUILD_TYPE" ]; then
  read -a CFENV_ARGS <<<$(cat $APP_DIR/deploy/.cfenv.$BUILD_TYPE | sed -E 's/([^=]+)=(.*)/-e \1=\2/gi')
fi

if [ -f "$APP_DIR/deploy/.cfenv" ]; then
  read -a USER_CFENV_ARGS <<<$(cat $APP_DIR/deploy/.cfenv | sed -E 's/([^=]+)=(.*)/-e \1=\2/gi')
fi

docker run -a stdout -t --name lambda --rm \
    -p 9000:8080 \
    -e AWS_REGION=$AWS_REGION \
    -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
    -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
    -e NEW_RELIC_LOG_SERVER_HOST=localhost \
    -e NEW_RELIC_LAMBDA_HANDLER=nr-reports-scheduler/lambda.handler \
    -e LOG_LEVEL=debug \
    "${DOCKER_RUN_ARGS[@]}" \
    "${CFENV_ARGS[@]}" \
    "${USER_CFENV_ARGS[@]}" \
    --platform=linux/amd64 \
    $IMAGE_NAME | tr -s "\r" "\n"
