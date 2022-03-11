#!/bin/bash

FUNCTION_NAME=$(npm run --silent aws-lambda-function-name)

echo "Tailing logs for /aws/lambda/$FUNCTION_NAME..."
aws logs tail --follow --format detailed /aws/lambda/$FUNCTION_NAME | tr "\r" "\n"
