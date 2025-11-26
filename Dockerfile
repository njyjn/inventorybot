# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Install CA certificates, jq, and build dependencies for sqlite3
RUN apk add --no-cache ca-certificates jq python3 python3-dev py3-setuptools make g++ gcc

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma Client (migrations will run at startup)
RUN npm run prisma:generate

# Build the Next.js application
RUN npm run build

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Start the Next.js application with configurable port
CMD ["/app/start.sh"]