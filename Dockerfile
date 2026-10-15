# ----------------------------------------------------
# Stage 1: Build Frontend Client and Backend Server
# ----------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm install

# Copy application source files
COPY . .

# Compile client SPA into dist/ and bundle backend into dist/server.js
RUN npm run build

# ----------------------------------------------------
# Stage 2: Production Minimal Runtime (Cloud Run / Railway)
# ----------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm install --production --ignore-scripts && npm cache clean --force

# Copy compiled distribution artifacts and runtime data
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/public ./public

# Expose production port (dynamically overridden by Cloud Run / Railway)
EXPOSE 3000

# Start production Express server
CMD ["node", "dist/server.js"]
