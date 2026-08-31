#!/bin/bash

# Generate cookies.txt from environment variable if set
if [ -n "$YOUTUBE_COOKIES" ]; then
  echo "🍪 Generating cookies.txt from environment variable..."
  echo "$YOUTUBE_COOKIES" > /app/cookies.txt
  echo "✅ cookies.txt created ($(wc -l < /app/cookies.txt) lines)"
else
  rm -f /app/cookies.txt
  echo "ℹ️ Running in clean unauthenticated mode (no cookies.txt)"
fi

# Start the bgutil companion server in the background
cd /root/bgutil-ytdlp-pot-provider/server
node build/main.js &

# Wait for the companion server to start up
sleep 3

# Go back to /app and start the bot
cd /app
npm start
