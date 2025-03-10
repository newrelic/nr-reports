FROM amazoncorretto:21-al2023-headless

ENV LOG_LEVEL=INFO
ENV NEW_RELIC_REGION=US
ENV SCHEDULE_GROUP_NAME=schedules
ENV REPORTS_HOME=/app
ENV PATH=/opt/node-v20.18.3-linux-x64/bin:$PATH

ADD nr-reports-quartz-scheduler/build/distributions/nr-reports-quartz-scheduler-*.tar /app
COPY nr-reports-cli/ /app/nr-reports-cli/
COPY nr-reports-core/ /app/nr-reports-core
COPY templates/ /app/nr-reports-cli/templates/
COPY include/ /app/nr-reports-cli/include/

# see https://github.com/nodesource/distributions?tab=readme-ov-file#amazon-linux-versions
# note: we install findutils below for the gradle application plugin scripts
RUN curl -fsSL https://rpm.nodesource.com/setup_20.x -o nodesource_setup.sh && \
    bash nodesource_setup.sh && \
    yum install -y findutils nodejs && \
    cd /app/nr-reports-core && \
    npm i --omit=dev && \
    cd /app/nr-reports-cli && \
    npm i --omit=dev --legacy-peer-deps && \
    cd /app && \
    mkdir nr-reports-quartz-scheduler && \
    mv nr-reports-quartz-scheduler-*/* nr-reports-quartz-scheduler && \
    rm -rf nr-reports-quartz-scheduler-*

WORKDIR /app/nr-reports-quartz-scheduler

ENTRYPOINT ["/app/nr-reports-quartz-scheduler/bin/nr-reports-quartz-scheduler"]
