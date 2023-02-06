#!/bin/bash

function handle_option {
  case "$1" in
    --cli-args)
      if [ -n "$2" ]; then
        CLI_ARGS=$2
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

echo "CLI Arguments:               $CLI_ARGS"
echo "------------------------------------"

if [ -z "$CLI_ARGS" ]; then
  CLI_ARGS=""
fi

if [ -z "$CRON_ENTRY" ]; then
  CRON_ENTRY="00   *   *   *   *"
fi

if [ -z "$IMAGE_REPO" ]; then
  IMAGE_REPO="nr-reports-cron"
fi

echo "Building CRON image..."
cd $ROOT_DIR && \
    docker build -f $ROOT_DIR/nr-reports-cli/Dockerfile-cron \
        --build-arg CLI_ARGS="$CLI_ARGS" \
        --build-arg CRON_ENTRY="$CRON_ENTRY" \
        --progress plain \
        -t $IMAGE_REPO:$IMAGE_TAG \
        $ROOT_DIR
