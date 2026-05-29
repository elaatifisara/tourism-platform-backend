# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY backend/src ./src

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
