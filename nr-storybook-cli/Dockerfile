FROM alpine:3.14

# Build args
ARG MANIFEST_FILE
ARG TEMPLATE_DIR

RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn
# Install node and make the app root
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn \
    nodejs \
    npm

# Copy function code
COPY nr-storybook-core /app/nr-storybook-core/
COPY nr-storybook-cli /app/nr-storybook-cli/
COPY templates /app/nr-storybook-cli/templates/
COPY ${TEMPLATE_DIR} /app/nr-storybook-cli/templates/
COPY ${MANIFEST_FILE} /app/nr-storybook-cli/manifest.json

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -g pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app && \
    cd /app/nr-storybook-core && \
    npm install --production && \
    cd /app/nr-storybook-cli && \
    npm install --production

WORKDIR /app/nr-storybook-cli

USER pptruser

# Container entry
ENTRYPOINT ["node", "index.js"]
