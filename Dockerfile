FROM node:22-bullseye-slim

# Install system dependencies including ffmpeg and python (needed for yt-dlp)
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip && \
    # Install yt-dlp dengan python EJS libraries via pip3
    # Ini akan otomatis mendeteksi Node.js bawaan image sebagai JS runtime
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
