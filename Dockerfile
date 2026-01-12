# Multi-stage build for Next.js + Python
FROM node:18-slim as node-base

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY requirements.txt ./

# Install Node.js dependencies
RUN npm ci

# Install Python dependencies
RUN python3 -m venv venv
RUN ./venv/bin/pip install --upgrade pip setuptools wheel
RUN ./venv/bin/pip install -r requirements.txt

# Copy application files
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]

