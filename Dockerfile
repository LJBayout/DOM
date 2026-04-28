FROM node:22-bookworm-slim

# Install pnpm directly
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copy only dependency-related files first
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install dependencies with verbose output to avoid "hanging" feel
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["pnpm", "run", "dev"]


