# Build arguments
ARG AWS_LAMBDA_VER=14

# Base image
FROM public.ecr.aws/lambda/nodejs:${AWS_LAMBDA_VER}

# Unzip the New Relic Lambda Extension layer
ADD nr-reports-scheduler/deploy/newrelic-lambda-extension-layer.tgz /opt

# Copy function code
COPY nr-reports-core ${LAMBDA_TASK_ROOT}/nr-reports-core/
COPY nr-reports-scheduler ${LAMBDA_TASK_ROOT}/nr-reports-scheduler/

# Install production dependencies
RUN cd ${LAMBDA_TASK_ROOT}/nr-reports-scheduler && \
    npm i --only=prod

# Set the CMD to the New Relic lambda wrapper handler function
CMD [ "newrelic-lambda-wrapper.handler" ]
