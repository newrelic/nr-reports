#!/bin/bash

if [ "$SCRIPT_DIR" = "" ]; then
  SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
fi

APP_DIR=$(pwd)
ROOT_DIR="$(dirname ${APP_DIR})"
APP_DIR_NAME=$(basename "$APP_DIR")
TARCMD="tar"

function println {
  printf "$1\n" "$2"
}

function err {
  printf "\e[31m%s\e[0m\n\n" "$1"
  exit 1
}

if [ -f "$SCRIPT_DIR/.env" ]; then
  source $SCRIPT_DIR/.env
fi

if [ -z "$AWS_REGION" ]; then
    AWS_REGION=$(aws configure get region)
fi
