# ── Stage 1: Build ──
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies required for Vite build)
RUN npm ci

# Copy the rest of the application source
COPY . .

# Build the React application
RUN npm run build


# ── Stage 2: Serve ──
FROM nginx:alpine AS production

# Copy custom nginx config if needed (we'll use default for now, which serves index.html)
# If using React Router, you typically need an nginx config to rewrite routes to index.html
# RUN rm /etc/nginx/conf.d/default.conf
# COPY nginx.conf /etc/nginx/conf.d/

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
