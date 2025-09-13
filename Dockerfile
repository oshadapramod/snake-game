############################################################
# Build stage
############################################################
FROM node:20-alpine AS build
WORKDIR /app

# Install only deps first for better layer caching
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build static assets (Vite output goes to dist)
RUN npm run build

############################################################
# Production stage (static file server via nginx)
############################################################
FROM nginx:1.27-alpine AS production

# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy build artifacts
COPY --from=build /app/dist /usr/share/nginx/html

# Minimal healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O - http://localhost:80/ >/dev/null 2>&1 || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

############################################################
# Notes:
# - For local dev you can still use: docker build -t snake-dev . && docker run -p 5173:80 snake-dev
#   then access via http://localhost:5173 (or map 80:80 instead)
# - If you need environment variables at runtime (not baked), consider a tiny entrypoint that
#   writes a config.js served statically, or use nginx envsubst pattern.
