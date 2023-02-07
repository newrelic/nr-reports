#!/bin/bash

if [ "$SCRIPT_DIR" = "" ]; then
  SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
fi

ROOT_DIR="$(dirname $(dirname ${SCRIPT_DIR}))"

usage() {
  BASE=$(basename "$0")
  echo "usage: $BASE --cron-entry cron-entry --image-repo image-repo --image-tag image-tag"
  exit
}

CRON_ENTRY=""
IMAGE_REPO=""
IMAGE_TAG="latest"
PARAMS=""

while (( "$#" )); do
  case "$1" in
    --help)
      usage
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
      RESULT=0
      if [[ $(type -t handle_option) == function ]]; then
        handle_option $1 "$2"
        RESULT=$?
      fi
      if (( $RESULT == 0 ))
        then
        echo "Error: Unsupported flag $1" >&2
        exit 1
      elif (( $RESULT == 1 ))
        then
        shift 1
      elif (( $RESULT == 2))
        then
        shift 2
      fi
      ;;
    *) # preserve positional arguments
      PARAMS="$PARAMS $1"
      shift
      ;;
  esac
done

# set positional arguments in their proper place
eval set -- "$PARAMS"

echo "------------------------------------"
echo "Root directory: $ROOT_DIR"
echo "------------------------------------"
echo "CRON entry:                  $CRON_ENTRY"
echo "Image repository:            $IMAGE_REPO"
echo "Image tag:                   $IMAGE_TAG"
echo "------------------------------------"
