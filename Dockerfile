FROM node:22-bookworm

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files and patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Copy project files
COPY . .

# Set pnpm configuration to avoid hard-link issues on macOS Docker volumes
RUN pnpm config set package-import-method copy
RUN pnpm config set store-dir /app/.pnpm-store

# Install dependencies
RUN pnpm install

# Expose port (default 3000 as per server/_core/index.ts)
EXPOSE 3000

# Start development server
CMD ["pnpm", "run", "dev"]
