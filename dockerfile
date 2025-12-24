FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /app

# System dependencies install karna
RUN apt-get update && apt-get install -y \
    google-chrome-stable \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Port ko environment se match karna
ENV PORT=50036
EXPOSE 50036

CMD ["node", "index.js"]

