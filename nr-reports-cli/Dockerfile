FROM alpine:3.14

# Install required packages
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
COPY nr-reports-core /app/nr-reports-core/
COPY nr-reports-cli /app/nr-reports-cli/
COPY templates /app/nr-reports-cli/templates/
COPY include /app/nr-reports-cli/include/

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -g pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app && \
    cd /app/nr-reports-core && \
    npm install --production && \
    cd /app/nr-reports-cli && \
    npm install --production

WORKDIR /app/nr-reports-cli

USER pptruser

# Container entry
ENTRYPOINT ["node", "index.js"]
