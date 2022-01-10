# Build arguments
ARG AWS_LAMBDA_VER=14

# Base image
FROM public.ecr.aws/lambda/nodejs:${AWS_LAMBDA_VER}

# Unzip the New Relic Lambda Extension layer
ADD /aws/newrelic-lambda-extension-layer.tgz /opt

# Copy function code
COPY package-lock.json package.json lambda.js ${LAMBDA_TASK_ROOT}
COPY templates ${LAMBDA_TASK_ROOT}/templates
COPY lib ${LAMBDA_TASK_ROOT}/lib

# Install production dependencies
RUN cd ${LAMBDA_TASK_ROOT} && npm install --production

# Set the CMD to the New Relic lambda wrapper handler function
CMD [ "newrelic-lambda-wrapper.handler" ]
