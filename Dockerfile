# Multi-stage build for Next.js + Python
FROM node:18

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY requirements.txt ./

# Install Node.js dependencies (including devDependencies for build)
RUN npm ci

# Install Python dependencies
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"
RUN pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.txt

# Copy application files
COPY . .

# Build Next.js
RUN npm run build

# Expose port (Render will set PORT env var automatically)
EXPOSE 3000

# Start command
CMD ["npm", "start"]

