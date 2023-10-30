#!/bin/bash

source $(dirname "$0")/init.sh

NOBUILD=0
BUILD_TYPE=test
PREFIX=
IMAGE_NAME=
STACK_NAME=${STACK_NAME:-"$APP_DIR_NAME"}
AWS_CF_DEPLOY_OPTS=${AWS_CF_DEPLOY_OPTS:-""}

while [ $# -ne 0 ]; do
    case "$1" in
        --prod)
            BUILD_TYPE=prod; shift;
            ;;
        --no-build)
            NOBUILD=1; shift;
            ;;
        --build-type)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then BUILD_TYPE=$1; shift; else err "missing build type with --build-type"; fi
            ;;
        -t)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then IMAGE_NAME=$1; shift; fi
            ;;
        -p)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then PREFIX=$1; shift; else err "missing prefix with -p"; fi
            ;;
        -n)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then STACK_NAME=$1; shift; fi
            ;;
        *)
            err "invalid option $1"
            ;;
    esac
done

if [ $NOBUILD -eq 0 ]; then
    ORIG_PREFIX=
    if [ -n "$PREFIX" ]; then
        ORIG_PREFIX="$PREFIX"
    fi

    source $(dirname "$0")/vars.sh

    PREFIX_ARG=""
    if [ -n "$ORIG_PREFIX" ]; then PREFIX_ARG="-p $ORIG_PREFIX"; fi

    PROD_ARG=""
    if [[ "$BUILD_TYPE" == "prod" ]]; then PROD_ARG="--prod"; fi

    if [ -z "$IMAGE_NAME" ]; then
        P_IMAGE_NAME=${PREFIX}IMAGE_NAME
        IMAGE_NAME=${!P_IMAGE_NAME:-$APP_DIR_NAME}
    fi

    $SCRIPT_DIR/build.sh -t "$IMAGE_NAME" --full --push $PROD_ARG $PREFIX_ARG
else
    source $(dirname "$0")/vars.sh
fi

println "\n%s" "-- DEPLOY ----------------------------------------------------------------------"
println "Root directory:                          $ROOT_DIR"
println "App directory:                           $APP_DIR"
println "AWS region:                              $AWS_REGION"
println "Prefix:                                  $PREFIX"
println "Build type:                              $BUILD_TYPE"
println "Stack Name:                              $STACK_NAME"
println "%s\n" "--------------------------------------------------------------------------------"

printf "Deploying stack $STACK_NAME...\n"
aws cloudformation deploy \
    --stack-name $STACK_NAME \
    --template-file $APP_DIR/deploy/cf-template.yaml \
    --output table \
    --no-cli-pager \
    --color on \
    --parameter-overrides file://$APP_DIR/deploy/cf-params.$BUILD_TYPE.json \
    $AWS_CF_DEPLOY_OPTS

println "Done."
