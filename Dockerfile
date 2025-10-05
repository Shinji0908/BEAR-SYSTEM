# Railway Dockerfile for BEAR System Backend
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bear-backend/package*.json ./bear-backend/

# Install root dependencies
RUN npm install

# Install backend dependencies
WORKDIR /app/bear-backend
RUN npm install --production

# Copy backend source code
COPY bear-backend/ ./

# Expose port
EXPOSE 5000

# Start the backend
CMD ["node", "railway-start.js"]
