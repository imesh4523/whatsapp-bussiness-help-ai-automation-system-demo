# Use official Node.js runtime as parent image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy full project files
COPY . .

# Build frontend to /app/dist
RUN npm run build

# Switch to the server directory
WORKDIR /app/server

# Install backend dependencies
RUN npm ci

# Expose the application port
EXPOSE 8080

# Configure production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start backend server (which serves the frontend build from /app/dist)
CMD ["node", "index.js"]
