#!/bin/bash

if [ "$SCRIPT_DIR" == "" ]; then
    SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
fi

ROOT_DIR="$(dirname $(dirname ${SCRIPT_DIR}))"
AWS_DIR=$ROOT_DIR/nr-storybook-lambda

PARAMS=""
PACKAGE_NAME=""

while (( "$#" )); do
  case "$1" in
    -s|--package-name)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        PACKAGE_NAME=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -*|--*=) # unsupported flags
      echo "Error: Unsupported flag $1" >&2
      exit 1
      ;;
    *) # preserve positional arguments
      PARAMS="$PARAMS $1"
      shift
      ;;
  esac
done

# set positional arguments in their proper place
eval set -- "$PARAMS"

usage() {
    BASE=$(basename "$0")
    echo "usage: $BASE --package-name package-name"
    exit 1
}

if [ -z "$PACKAGE_NAME" ]; then
    usage
fi

if [ -z "$AWS_REGION" ]; then
    AWS_REGION=$(aws configure get region)
fi

AWS_LAMBDA_VER=${AWS_LAMBDA_VER:-14}
NEW_RELIC_LAYER_NAME=${NEW_RELIC_LAYER_NAME:-NewRelicNodeJS14X}
NEW_RELIC_LAYER_VER=${NEW_RELIC_LAYER_VER:-33}
FUNCTION_NAME=$(npm run --silent function-name)
ECR_REPO_URI=$(npm run --silent image-repo-uri)
ECR_IMAGE_TAG=$(npm run --silent image-tag)

echo "------------------------------------"
echo "Root directory: $ROOT_DIR"
echo "AWS directory:  $APP_DIR"
echo "AWS region:     $AWS_REGION"
echo "------------------------------------"
echo "New Relic Lamda Extension layer name:     $NEW_RELIC_LAYER_NAME"
echo "New Relic Lamda Extension layer version:  $NEW_RELIC_LAYER_VER"
echo "AWS Node.js Lambda version:  $AWS_LAMBDA_VER"
echo "Package name:                $PACKAGE_NAME"
echo "Function name:               $FUNCTION_NAME"
echo "ECR repository URI:          $ECR_REPO_URI"
echo "ECR image tag:               $ECR_IMAGE_TAG"
echo "------------------------------------"
