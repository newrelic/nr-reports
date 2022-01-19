#!/bin/bash

if [ "$SCRIPT_DIR" = "" ]; then
  SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
fi

ROOT_DIR="$(dirname $(dirname ${SCRIPT_DIR}))"

usage() {
  BASE=$(basename "$0")
  echo "usage: $BASE --template-dir dir --manifest-file file --cron-entry cron-entry --image-repo image-repo --image-tag image-tag"
  exit
}

MANIFEST_FILE="manifest.json"
TEMPLATE_DIR="templates"
CRON_ENTRY="00   *   *   *   *"
IMAGE_REPO="nr-storybook-cron"
IMAGE_TAG="latest"
PARAMS=""

while (( "$#" )); do
  case "$1" in
    --help)
      usage
      ;;
    --manifest-file)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        MANIFEST_FILE=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    --template-dir)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        TEMPLATE_DIR=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    --cron-entry)
      set -o noglob
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        CRON_ENTRY=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      set +o noglob
      ;;
    --image-repo)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        IMAGE_REPO=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    --image-tag)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        IMAGE_TAG=$2
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

if [ -z "$IMAGE_REPO" ]; then
  usage
fi

echo "------------------------------------"
echo "Root directory: $ROOT_DIR"
echo "------------------------------------"
echo "Manifest file:               $MANIFEST_FILE"
echo "Template dir:                $TEMPLATE_DIR"
echo "CRON entry:                  $CRON_ENTRY"
echo "Image repository:            $IMAGE_REPO"
echo "Image tag:                   $IMAGE_TAG"
echo "------------------------------------"
