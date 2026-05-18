# Single-stage Dockerfile for SvelteKit SSR on Cloud Run.
# Context: frontend/ directory (containing build/).

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
EXPOSE 8080

# The build directory contains the adapter-node output.
# A generated build/package.json with only runtime deps must exist.
COPY ./build/package.json /app/package.json
RUN npm install --production --ignore-scripts 2>&1 | tail -3

# Copy all build output
COPY ./build/ .

# Start the SvelteKit HTTP server (from adapter-node built-in index.js)
CMD ["node", "index.js"]
