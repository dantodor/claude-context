# Multi-stage build for Claude Context MCP Server
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/mcp/package.json ./packages/mcp/

# Install pnpm and dependencies
RUN npm install -g pnpm@latest
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/core ./packages/core
COPY packages/mcp ./packages/mcp
COPY tsconfig.json ./

# Build the packages
RUN pnpm build

# Production stage
FROM node:20-alpine AS runtime

# Install pnpm
RUN npm install -g pnpm@latest

# Set working directory
WORKDIR /app

# Copy built packages
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/mcp/dist ./packages/mcp/dist
COPY --from=builder /app/packages/mcp/package.json ./packages/mcp/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001

# Change ownership of the app directory
RUN chown -R mcp:nodejs /app
USER mcp

# Expose port (though MCP uses stdio, this is for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('MCP Server is healthy')" || exit 1

# Set default environment variables
ENV NODE_ENV=production
ENV EMBEDDING_PROVIDER=Ollama
ENV OLLAMA_HOST=http://ollama:11434
ENV OLLAMA_MODEL=nomic-embed-text
ENV VECTOR_DATABASE=Qdrant
ENV QDRANT_HOST=qdrant
ENV QDRANT_PORT=6333

# Start the MCP server
CMD ["node", "packages/mcp/dist/index.js"]