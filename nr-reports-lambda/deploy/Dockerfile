# Build arguments
ARG AWS_LAMBDA_VER=14

# Base image
FROM public.ecr.aws/lambda/nodejs:${AWS_LAMBDA_VER}

# Unzip the New Relic Lambda Extension layer
ADD nr-reports-lambda/deploy/newrelic-lambda-extension-layer.tgz /opt

# Copy function code
COPY nr-reports-core ${LAMBDA_TASK_ROOT}/nr-reports-core/
COPY nr-reports-lambda ${LAMBDA_TASK_ROOT}/nr-reports-lambda/
COPY templates ${LAMBDA_TASK_ROOT}/templates/
COPY include ${LAMBDA_TASK_ROOT}/include

# Install production dependencies
RUN cd ${LAMBDA_TASK_ROOT}/nr-reports-lambda && \
    npm i --only=prod

# Set the CMD to the New Relic lambda wrapper handler function
CMD [ "newrelic-lambda-wrapper.handler" ]
