#!/bin/bash

source $(dirname "$0")/init.sh

PREFIX=
FUNCTION_NAME=

while [ $# -ne 0 ]; do
    case "$1" in
        -n)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then FUNCTION_NAME=$1; shift; else err "missing function name with -n"; fi
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

if [ -z "$FUNCTION_NAME" ]; then
    P_FUNCTION_NAME=${PREFIX}FUNCTION_NAME
    FUNCTION_NAME=${!P_FUNCTION_NAME}

    if [ -z "$FUNCTION_NAME" ]; then
        err 'missing function name'
        exit 1
    fi
fi

println "Tailing logs for /aws/lambda/$FUNCTION_NAME..."
aws logs tail --follow --format detailed /aws/lambda/$FUNCTION_NAME
