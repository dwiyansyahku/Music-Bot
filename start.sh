#!/bin/bash

# Start the bgutil companion server in the background
cd /opt/bgutil/server
npm start &

# Wait for the companion server to start up
sleep 3

# Go back to /app and start the bot
cd /app
npm start
