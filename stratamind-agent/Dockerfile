# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Production Stage
FROM node:20-alpine
WORKDIR /app

# Copy package files (needed for production dependencies if any, though we bundled frontend)
# We need backend deps. 
COPY package*.json ./
# Install ONLY production dependencies
RUN npm ci --only=production

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server source code
COPY --from=builder /app/server ./server
COPY --from=builder /app/services ./services

# Expose the port
ENV PORT=8080
EXPOSE 8080

# Start command
# We need to make sure we run the server from the right place relative to 'dist'
CMD ["node", "server/server.js"]
