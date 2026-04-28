# 📄 Ficha Técnica — DOM Produções

A premium, editorial-grade technical documentation platform for event production management. Built with a focus on visual excellence and operational efficiency.

![Project Preview](https://via.placeholder.com/1200x600?text=Ficha+T%C3%A9cnica+Editorial+Design)

## ✨ Overview

**Ficha Técnica** is a specialized tool designed for production teams to create, manage, and share high-fidelity technical event sheets. Moving away from messy spreadsheets, this platform provides a structured "Editorial" experience that feels like a premium digital publication while maintaining the rigor required for live event logistics.

### 🎨 Design Philosophy
- **Editorial Aesthetic**: Uses a curated palette of Cream, Gold, and Ink.
- **Typography-First**: Leveraging *Playfair Display* and *Cormorant Garamond* for a sophisticated look.
- **Responsive & Alive**: Fluid transitions and micro-animations for a premium feel.

## 🚀 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + Vanilla CSS (Design Tokens)
- **Routing**: [Wouter](https://github.com/molecula-js/wouter)
- **API Client**: [tRPC](https://trpc.io/) (End-to-end typesafety)
- **State Management**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Components**: [Radix UI](https://www.radix-ui.com/) + [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) with [tsx](https://tsx.is/)
- **Server**: [Express](https://expressjs.com/)
- **API**: [tRPC Server](https://trpc.io/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: [MySQL 8.0](https://www.mysql.com/)
- **Storage**: S3-compatible via Forge API

## 🛠️ Features

- **🔒 Role-Based Access**:
  - **Admins**: Full CRUD capabilities for Fichas, including schedule and professional management.
  - **Users**: Secure read-only access to published technical sheets.
- **📅 Schedule Management**: Dynamic "Cronograma" with sortable items.
- **👥 Professional Directory**: Track crew, roles, and contacts per event.
- **🏨 Lodging & Logistics**: Dedicated sections for hotel info and local production contacts.
- **📂 File Attachments**: Upload and manage PDF Riders and attraction documents.
- **🌗 Status Workflow**: Manage Fichas as "Draft" or "Published".

## 📦 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose
- [pnpm](https://pnpm.io/) (recommended) or npm/yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd ficha-tecnica
   ```

2. **Environment Setup**:
   Create a `.env` file in the root based on the provided template:
   ```env
   DATABASE_URL=mysql://root:password@db:3306/ficha_tecnica
   JWT_SECRET=your-secret-key
   # OAuth Settings
   VITE_OAUTH_PORTAL_URL=...
   VITE_APP_ID=...
   OAUTH_SERVER_URL=...
   ```

3. **Start the environment (Docker)**:
   ```bash
   docker-compose up -d
   ```
   This starts:
   - **App**: `http://localhost:3000`
   - **MySQL**: `localhost:3306`
   - **phpMyAdmin**: `http://localhost:8080`

4. **Initialize Database**:
   ```bash
   pnpm db:push
   ```

## 🏗️ Project Structure

```text
├── client/             # Vite + React application
│   ├── src/
│   │   ├── _core/      # Authentication & Base hooks
│   │   ├── components/ # UI Design System
│   │   ├── pages/      # Dashboard, Form, View, Login
│   │   └── lib/        # tRPC & Utility configurations
├── server/             # Express + tRPC backend
│   ├── _core/          # Server initialization & middleware
│   ├── db.ts           # Database access layer
│   ├── routers.ts      # tRPC Route definitions
│   └── storage.ts      # S3/Forge storage logic
├── shared/             # Shared types and constants
├── drizzle/            # Schema definitions & migrations
└── docker-compose.yml  # Local infrastructure
```

## 🧪 Development

### Running Locally (without Docker)
```bash
pnpm install
pnpm dev
```

### Building for Production
```bash
pnpm build
```

## 📜 License
MIT
# DOMM
