FROM node:22-bullseye-slim

# Install system dependencies including ffmpeg and python (needed for yt-dlp)
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip curl && \
    # Install Deno as the JS runtime for yt-dlp EJS challenges
    curl -fsSL https://deno.land/install.sh | sh && \
    mv /root/.deno/bin/deno /usr/local/bin/deno && \
    # Install yt-dlp with python EJS libraries using pip3
    pip3 install -U --no-cache-dir "yt-dlp[default]" && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Run the bot
CMD ["npm", "start"]
