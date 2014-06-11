#!/bin/bash
echo 'browserify authorify-websocket...' && \
browserify ./index.js -o build/authorify-websocket.bundle.js && \
echo 'browserify dependencies' && \
node buildprimus.js && \
cd build && \
echo 'bundle...' && \
cat primus.bundle.js authorify-websocket.bundle.js > authorify-websocket.js && \
echo 'done'