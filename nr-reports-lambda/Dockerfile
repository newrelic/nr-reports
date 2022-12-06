# Build arguments
ARG AWS_LAMBDA_VER=14

# Base image
FROM public.ecr.aws/lambda/nodejs:${AWS_LAMBDA_VER}

# Build args
ARG MANIFEST_FILE
ARG TEMPLATE_DIR

# Unzip the New Relic Lambda Extension layer
ADD nr-reports-lambda/newrelic-lambda-extension-layer.tgz /opt

# Copy function code
COPY nr-reports-core ${LAMBDA_TASK_ROOT}/nr-reports-core/
COPY nr-reports-lambda ${LAMBDA_TASK_ROOT}/nr-reports-lambda/
COPY templates ${LAMBDA_TASK_ROOT}/templates/
COPY ${TEMPLATE_DIR} ${LAMBDA_TASK_ROOT}/nr-reports-lambda/templates/
COPY ${MANIFEST_FILE} ${LAMBDA_TASK_ROOT}/nr-reports-lambda/manifest.json

# Install production dependencies
RUN cd ${LAMBDA_TASK_ROOT}/nr-reports-core && \
    npm install --production && \
    cd ${LAMBDA_TASK_ROOT}/nr-reports-lambda && \
    npm install --production

# Set the CMD to the New Relic lambda wrapper handler function
CMD [ "newrelic-lambda-wrapper.handler" ]
