#!/bin/bash

source $(dirname "$0")/init.sh

PREFIX=
FULL=0
PUSH=0
IMAGE_NAME=
ECR_IMAGE_REPO=
ECR_IMAGE_TAG=

while [ $# -ne 0 ]; do
    case "$1" in
        --full)
            FULL=1; shift;
            ;;
        --push)
            PUSH=1; shift;
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

source $(dirname "$0")/vars.sh

if [ -z "$IMAGE_NAME" ]; then
    P_IMAGE_NAME=${PREFIX}IMAGE_NAME
    IMAGE_NAME=${!P_IMAGE_NAME:-$APP_DIR_NAME}
fi

if [ $PUSH -eq 1 ]; then
    # If we are called from update.sh, this part is redundant but it probably
    # makes more sense to repeat than to pass it from update.sh.
    P_ECR_IMAGE_REPO=${PREFIX}ECR_IMAGE_REPO
    ECR_IMAGE_REPO=${!P_ECR_IMAGE_REPO}
    P_ECR_IMAGE_TAG=${PREFIX}ECR_IMAGE_TAG
    ECR_IMAGE_TAG=${!P_ECR_IMAGE_TAG}

    if [ -z "$ECR_IMAGE_REPO" -o -z "$ECR_IMAGE_TAG" ]; then
        err "missing ECR image repo or tag"
    fi
fi

AWS_LAMBDA_VER=${AWS_LAMBDA_VER:-20}
NEW_RELIC_LAYER_NAME=${NEW_RELIC_LAYER_NAME:-NewRelicNodeJS20X}
NEW_RELIC_LAYER_VER=${NEW_RELIC_LAYER_VER:-49}

println "\n%s" "-- BUILD -----------------------------------------------------------------------"
println "Root directory:                          $ROOT_DIR"
println "App directory:                           $APP_DIR"
println "AWS region:                              $AWS_REGION"
println "Prefix:                                  $PREFIX"
println "Build type:                              $BUILD_TYPE"
println "Full build:                              $FULL"
println "Push image:                              $PUSH"
println "Image name:                              $IMAGE_NAME"
println "New Relic Lamda Extension layer name:    $NEW_RELIC_LAYER_NAME"
println "New Relic Lamda Extension layer version: $NEW_RELIC_LAYER_VER"
println "AWS Node.js Lambda version:              $AWS_LAMBDA_VER"

if [ $PUSH -eq 1 ]; then
    println "ECR image repo:                          $ECR_IMAGE_REPO"
    println "ECR image tag:                           $ECR_IMAGE_TAG"
fi

println "%s\n" "--------------------------------------------------------------------------------"

if [ $FULL -eq 1 ]; then
    println "Downloading New Relic Lambda Extension layer...\n"
    LAYER_URL=$(aws lambda get-layer-version-by-arn --arn arn:aws:lambda:$AWS_REGION:451483290750:layer:$NEW_RELIC_LAYER_NAME:$NEW_RELIC_LAYER_VER --query Content.Location --output text)
    cd $APP_DIR/deploy && \
        rm -f newrelic-lambda-extension-layer.tgz && \
        rm -rf /tmp/nrlambda && \
        mkdir -p /tmp/nrlambda/extract && \
        cd /tmp/nrlambda/extract && \
        curl $LAYER_URL -o /tmp/nrlambda/layer.zip && \
        unzip -q ../layer.zip && \
        $TARCMD -zcf ../newrelic-lambda-extension-layer.tgz . && \
        cp ../newrelic-lambda-extension-layer.tgz $APP_DIR/deploy && \
        rm -rf /tmp/nrlambda
fi

println "Building image...\n"
cd $ROOT_DIR && \
    docker build -f $APP_DIR/deploy/Dockerfile \
    --build-arg AWS_LAMBDA_VER=$AWS_LAMBDA_VER \
    --progress plain \
    -t $IMAGE_NAME \
    --platform=linux/amd64 \
    $ROOT_DIR

if [ $PUSH -eq 1 ]; then
    ECR_HOST=$(echo -n $ECR_IMAGE_REPO | sed -E 's/([^\/]+)\/(.+)/\1/gi')

    println "Logging into ECR $ECR_HOST...\n"
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_HOST"

    println "Pushing image...\n"
    docker tag $IMAGE_NAME $ECR_IMAGE_REPO:$ECR_IMAGE_TAG && \
        docker push $ECR_IMAGE_REPO:$ECR_IMAGE_TAG
fi

println "Done."
