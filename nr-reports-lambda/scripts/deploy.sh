#!/bin/bash

source $(dirname "$0")/build.sh $* full
    
echo "Pushing image..."
docker tag $PACKAGE_NAME:$ECR_IMAGE_TAG $ECR_REPO_URI:$ECR_IMAGE_TAG && \
    docker push $ECR_REPO_URI:$ECR_IMAGE_TAG

echo "Deploying stack $PACKAGE_NAME..."
aws cloudformation deploy \
    --stack-name $PACKAGE_NAME \
    --template-file $ROOT_DIR/nr-reports-lambda/cf-template.yaml \
    --output table \
    --no-cli-pager \
    --color on \
    --parameter-overrides file://$ROOT_DIR/nr-reports-lambda/cf-params.json

echo "Done."
