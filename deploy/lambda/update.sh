#!/bin/bash

source $(dirname "$0")/init.sh

PREFIX=
BUILD_TYPE=deploy
BUILD=0
IMAGE_NAME=
ECR_IMAGE_REPO=
ECR_IMAGE_TAG=
FUNCTION_NAME=
AWS_LAMBDA_UPDATE_OPTS=${AWS_LAMBDA_UPDATE_OPTS:-""}

while [ $# -ne 0 ]; do
    case "$1" in
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
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then FUNCTION_NAME=$1; shift; else err "missing function name with -n"; fi
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

PREFIX_ARG=""
if [ -n "$ORIG_PREFIX" ]; then PREFIX_ARG="-p $ORIG_PREFIX"; fi

if [ -z "$IMAGE_NAME" ]; then
    P_IMAGE_NAME=${PREFIX}IMAGE_NAME
    IMAGE_NAME=${!P_IMAGE_NAME:-$APP_DIR_NAME}
fi

if [ $BUILD -eq 1 ]; then
    $SCRIPT_DIR/build.sh -t "$IMAGE_NAME" --full --push --build-type $BUILD_TYPE $PREFIX_ARG
fi

println "\n%s" "-- UPDATE ----------------------------------------------------------------------"
println "Root directory:                          $ROOT_DIR"
println "App directory:                           $APP_DIR"
println "AWS region:                              $AWS_REGION"
println "Prefix:                                  $PREFIX"
println "Build type:                              $BUILD_TYPE"
println "Build:                                   $BUILD"
println "Image name:                              $IMAGE_NAME"
println "ECR image repo:                          $ECR_IMAGE_REPO"
println "ECR image tag:                           $ECR_IMAGE_TAG"
println "Function name:                           $FUNCTION_NAME"
println "Update function options:                 $AWS_LAMBDA_UPDATE_OPTS"
println "%s\n" "--------------------------------------------------------------------------------"

aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --image-uri $ECR_IMAGE_REPO:$ECR_IMAGE_TAG \
    --output table \
    --no-cli-pager \
    --color on \
    $AWS_LAMBDA_UPDATE_OPTS \
    > /dev/null
