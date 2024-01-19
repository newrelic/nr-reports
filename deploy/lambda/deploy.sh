#!/bin/bash

source $(dirname "$0")/init.sh

PREFIX=
BUILD_TYPE=deploy
NOBUILD=0
IMAGE_NAME=
STACK_NAME=${STACK_NAME:-"$APP_DIR_NAME"}
AWS_CF_DEPLOY_OPTS=${AWS_CF_DEPLOY_OPTS:-""}

while [ $# -ne 0 ]; do
    case "$1" in
        --no-build)
            NOBUILD=1; shift;
            ;;
        --build-type)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then BUILD_TYPE=$1; shift; else err "missing build type with --build-type"; fi
            ;;
        -t)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then IMAGE_NAME=$1; shift; else err "missing image name with -t"; fi
            ;;
        -p)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then PREFIX=$1; shift; else err "missing prefix with -p"; fi
            ;;
        -n)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then STACK_NAME=$1; shift; else err "missing stack name with -n"; fi
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

    if [ -z "$IMAGE_NAME" ]; then
        P_IMAGE_NAME=${PREFIX}IMAGE_NAME
        IMAGE_NAME=${!P_IMAGE_NAME:-$APP_DIR_NAME}
    fi

    $SCRIPT_DIR/build.sh -t "$IMAGE_NAME" --full --push --build-type $BUILD_TYPE $PREFIX_ARG
else
    source $(dirname "$0")/vars.sh
fi

println "\n%s" "-- DEPLOY ----------------------------------------------------------------------"
println "Root directory:                          $ROOT_DIR"
println "App directory:                           $APP_DIR"
println "AWS region:                              $AWS_REGION"
println "Prefix:                                  $PREFIX"
println "Build type:                              $BUILD_TYPE"
println "No build:                                $NOBUILD"
println "Stack Name:                              $STACK_NAME"
println "Deploy stack options:                    $AWS_CF_DEPLOY_OPTS"
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
