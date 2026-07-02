FROM node:22-bookworm-slim

# Install system dependencies including ffmpeg and python (needed for yt-dlp)
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip && \
    pip3 install -U --break-system-packages --no-cache-dir pip && \
    pip3 install -U --break-system-packages --no-cache-dir "yt-dlp[default]" && \
    pip3 install -U --break-system-packages --no-cache-dir "yt-dlp-youtube-oauth2" && \
    pip3 uninstall -y --break-system-packages bgutil-ytdlp-pot-provider || true && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Run the bot
CMD ["npm", "start"]
