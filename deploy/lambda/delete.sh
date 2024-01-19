#!/bin/bash

source $(dirname "$0")/init.sh

PREFIX=
STACK_NAME=${STACK_NAME:-"$APP_DIR_NAME"}
AWS_CF_DELETE_OPTS=${AWS_CF_DELETE_OPTS:-""}

while [ $# -ne 0 ]; do
    case "$1" in
        -n)
            shift
            if [ -n "$1" ] && [ ${1:0:1} != "-" ]; then STACK_NAME=$1; shift; else err "missing stack name with -n"; fi
            ;;
        *)
            err "invalid option $1"
            ;;
    esac
done

source $(dirname "$0")/vars.sh

println "\n%s" "-- DELETE -----------------------------------------------------------------------"
println "Root directory:                          $ROOT_DIR"
println "App directory:                           $APP_DIR"
println "AWS region:                              $AWS_REGION"
println "Prefix:                                  $PREFIX"
println "Stack Name:                              $STACK_NAME"
println "Delete stack options:                    $AWS_CF_DELETE_OPTS"
println "%s\n" "--------------------------------------------------------------------------------"

println "Deleting stack $STACK_NAME..."
aws cloudformation delete-stack \
    --stack-name $STACK_NAME \
    --output table \
    --no-cli-pager \
    --color on \
    $AWS_CF_DELETE_OPTS

println "Waiting for stack delete to complete..."
aws cloudformation wait stack-delete-complete \
    --stack-name $STACK_NAME \
    --output table \
    --no-cli-pager \
    --color on

println "Done."
