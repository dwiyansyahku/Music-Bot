FROM node:22-bookworm-slim

RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip git && \
    pip3 install -U --break-system-packages --no-cache-dir pip && \
    pip3 install -U --break-system-packages --no-cache-dir "yt-dlp[default]" && \
    pip3 install -U --break-system-packages --no-cache-dir "yt-dlp-youtube-oauth2" && \
    pip3 install -U --break-system-packages --no-cache-dir bgutil-ytdlp-pot-provider && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone & build bgutil PO Token provider server langsung di direktori yang dicari yt-dlp
RUN git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /root/bgutil-ytdlp-pot-provider && \
    cd /root/bgutil-ytdlp-pot-provider/server && \
    npm install && npx tsc && \
    ln -s /root/bgutil-ytdlp-pot-provider /opt/bgutil

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

COPY start.sh ./
RUN chmod +x start.sh
CMD ["./start.sh"]