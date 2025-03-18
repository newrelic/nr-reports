FROM alpine:3.21

# Install required packages
RUN apk add --no-cache \
    nodejs \
    npm

# Copy function code
COPY nr-reports-core /app/nr-reports-core/
COPY nr-reports-cli /app/nr-reports-cli/

RUN cd /app/nr-reports-core && \
    npm i --omit=dev && \
    cd /app/nr-reports-cli && \
    npm i --omit=dev

WORKDIR /app/nr-reports-cli

# Container entry
ENTRYPOINT ["node", "index.js"]
