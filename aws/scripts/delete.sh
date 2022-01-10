#!/bin/bash

source $(dirname "$0")/vars.sh

echo "Deleting stack $PACKAGE_NAME..."
aws cloudformation delete-stack \
    --stack-name $PACKAGE_NAME \
    --output table \
    --no-cli-pager \
    --color on

echo "Waiting for stack delete to complete..."
aws cloudformation wait stack-delete-complete \
    --stack-name $PACKAGE_NAME \
    --output table \
    --no-cli-pager \
    --color on

echo "Done."
