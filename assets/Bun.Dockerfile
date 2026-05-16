# Stage 1: Build the app
FROM oven/bun:latest AS builder
WORKDIR /app

# Install all dependencies (including Vite/Svelte)
COPY package.json bun.lockb* ./
RUN bun install

# Copy source code and build
COPY . .
RUN bun run build

# Stage 2: Production
FROM oven/bun:latest
WORKDIR /app
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0

# Copy the built app and package.json from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json

# Install ONLY production dependencies
RUN bun install --production

EXPOSE 8080

# Run the app from the build folder
CMD ["bun", "./build/index.js"]
