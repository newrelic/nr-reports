# Build arguments
ARG AWS_LAMBDA_VER=14

# Base image
FROM public.ecr.aws/lambda/nodejs:${AWS_LAMBDA_VER}

# Unzip the New Relic Lambda Extension layer
ADD nr-storybook-lambda/newrelic-lambda-extension-layer.tgz /opt

# Copy function code
COPY nr-storybook-core ${LAMBDA_TASK_ROOT}/nr-storybook-core/
COPY nr-storybook-lambda ${LAMBDA_TASK_ROOT}/nr-storybook-lambda/
COPY templates ${LAMBDA_TASK_ROOT}/templates/
#COPY ${TEMPLATE_DIR} ${LAMBDA_TASK_ROOT}/nr-storybook-lambda/templates/
#COPY ${MANIFEST_FILE} ${LAMBDA_TASK_ROOT}/nr-storybook-lambda/manifest.json

# Install production dependencies
RUN cd ${LAMBDA_TASK_ROOT}/nr-storybook-core && \
    npm install --production && \
    cd ${LAMBDA_TASK_ROOT}/nr-storybook-lambda && \
    npm install --production

# Set the CMD to the New Relic lambda wrapper handler function
CMD [ "newrelic-lambda-wrapper.handler" ]
