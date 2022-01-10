#!/bin/bash

source $(dirname "$0")/build.sh $*
    
echo "Pushing image..."
docker tag $PACKAGE_NAME:$ECR_IMAGE_TAG $ECR_REPO_URI:$ECR_IMAGE_TAG && \
    docker push $ECR_REPO_URI:$ECR_IMAGE_TAG

cd $SCRIPT_DIR/.. && aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --image-uri $ECR_REPO_URI:$ECR_IMAGE_TAG \
    --output table \
    --no-cli-pager \
    --color on
