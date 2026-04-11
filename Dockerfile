FROM node:20-slim

# Install Chromium and dependencies for Puppeteer (required by whatsapp-web.js)
RUN apt-get update && apt-get install -y \
    chromium \
    libgbm-dev \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    wget \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the server directory only (not Next.js frontend)
COPY server/ ./server/

# Create data and sessions directories
RUN mkdir -p /app/data /app/sessions /app/uploads

# Expose the API port
EXPOSE 3001

CMD ["node", "server/server.js"]
