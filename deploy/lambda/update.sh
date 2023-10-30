#!/bin/bash

source $(dirname "$0")/init.sh

BUILD=0
BUILD_TYPE=test
PREFIX=
IMAGE_NAME=
FUNCTION_NAME=
ECR_IMAGE_REPO=
ECR_IMAGE_TAG=
AWS_LAMBDA_UPDATE_OPTS=${AWS_LAMBDA_UPDATE_OPTS:-""}

while [ $# -ne 0 ]; do
    case "$1" in
        --prod)
            BUILD_TYPE=prod; shift;
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
        -n)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then FUNCTION_NAME=$1; shift; fi
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

if [ -z "$FUNCTION_NAME" ]; then
    P_FUNCTION_NAME=${PREFIX}FUNCTION_NAME
    FUNCTION_NAME=${!P_FUNCTION_NAME}

    if [ -z "$FUNCTION_NAME" ]; then
        err 'missing function name'
        exit 1
    fi
fi

# This is redundant with build.sh but build.sh is not always called.
P_ECR_IMAGE_REPO=${PREFIX}ECR_IMAGE_REPO
ECR_IMAGE_REPO=${!P_ECR_IMAGE_REPO}
P_ECR_IMAGE_TAG=${PREFIX}ECR_IMAGE_TAG
ECR_IMAGE_TAG=${!P_ECR_IMAGE_TAG}

if [ -z "$ECR_IMAGE_REPO" -o -z "$ECR_IMAGE_TAG" ]; then
    err "missing ECR image repo or tag"
fi

if [ -z "$IMAGE_NAME" ]; then
    P_IMAGE_NAME=${PREFIX}IMAGE_NAME
    IMAGE_NAME=${!P_IMAGE_NAME:-$APP_DIR_NAME}
fi

PREFIX_ARG=""
if [ -n "$ORIG_PREFIX" ]; then PREFIX_ARG="-p $ORIG_PREFIX"; fi

PROD_ARG=""
if [[ "$BUILD_TYPE" == "prod" ]]; then PROD_ARG="--prod"; fi

if [ $BUILD -eq 1 ]; then
    $SCRIPT_DIR/build.sh -t "$IMAGE_NAME" --full --push $PROD_ARG $PREFIX_ARG
fi

println "\n%s" "-- UPDATE ----------------------------------------------------------------------"
println "Root directory:                          $ROOT_DIR"
println "App directory:                           $APP_DIR"
println "AWS region:                              $AWS_REGION"
println "Prefix:                                  $PREFIX"
println "Function name:                           $FUNCTION_NAME"
println "ECR image repo:                          $ECR_IMAGE_REPO"
println "ECR image tag:                           $ECR_IMAGE_TAG"
println "%s\n" "--------------------------------------------------------------------------------"

aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --image-uri $ECR_IMAGE_REPO:$ECR_IMAGE_TAG \
    --output table \
    --no-cli-pager \
    --color on \
    $AWS_LAMBDA_UPDATE_OPTS
