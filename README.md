# Bardon Lodge Directors Email Alias

A unified **Cloudflare Workers** application that provides email forwarding for the Bardon Lodge directors alias with a **React SPA** for recipient management. Built with the **Cloudflare Vite plugin** for seamless development experience.

## 🏗️ **Unified Architecture**

### **🚀 Single Application Stack**

- **React 18 SPA** - Modern recipient management interface
- **Cloudflare Worker** - Email forwarding + API + SPA serving
- **Cloudflare D1** - SQLite database for recipient storage
- **Cloudflare Access** - Zero Trust authentication
- **Vite 7 + Cloudflare Plugin** - Unified development environment

### **🔧 Development Workflow**

- **Single `npm run dev`** - Runs both SPA and Worker in unified environment
- **Hot Module Replacement** - Real-time updates for both frontend and backend
- **Production Parity** - Development runs in actual Workers runtime (`workerd`)
- **Integrated Assets** - SPA automatically served by Worker

## 📁 **Project Structure**

```
├── src/                    # Cloudflare Worker code
│   ├── index.ts           # Main Worker (API + Email + SPA serving)
│   └── auth.ts            # Cloudflare Access authentication
├── spa/                   # React SPA source
│   ├── src/               # React components and logic
│   ├── dist/              # Built SPA assets (served by Worker)
│   └── package.json       # SPA dependencies (integrated into root)
├── infrastructure/        # Terraform IaC
├── migrations/           # D1 database migrations
├── wrangler.toml         # Worker configuration
├── vite.config.mjs       # Unified Vite + Cloudflare config
└── package.json          # Unified dependencies and scripts
```

## 🚀 **Quick Start**

### **Prerequisites**

- **Node.js 22.17+** (for Vite 7 + Cloudflare plugin compatibility)
- **Wrangler CLI** - `npm install -g wrangler`
- **Cloudflare account** with Workers/D1/Access enabled

### **Development**

```bash
# Install dependencies
npm install

# Start unified development server
npm run dev
# Opens: http://localhost:5173 (SPA + API + Hot reload)

# In development you get:
# - React SPA at http://localhost:5173/
# - API endpoints at http://localhost:5173/api/*
# - Real-time updates for both frontend and Worker code
# - D1 database bindings (local development)
```

### **Production Build & Deploy**

```bash
# Build both SPA and Worker
npm run build
# Creates: dist/client/ (SPA) + dist/directors_worker/ (Worker)

# Preview production build locally
npm run preview
# Tests: http://localhost:4173 (production-like environment)

# Deploy to Cloudflare
npm run deploy:staging   # Staging environment
npm run deploy:prod      # Production environment
```

## 🔐 **Authentication & Security**

### **Cloudflare Access Integration**

- **Zero Trust Authentication** - Managed via Cloudflare dashboard
- **Automatic Token Validation** - No manual login flow required
- **Policy-Based Access** - Configure via Terraform or dashboard
- **Email-Based Policies** - Restrict access by email domains

### **API Security**

- All `/api/*` endpoints require valid Cloudflare Access JWT
- Authentication middleware validates tokens automatically
- 403 Forbidden for unauthorized requests

## 📧 **Email Forwarding**

### **How It Works**

1. **Email arrives** at `directors@bardon-lodge.org`
2. **Worker processes** via email handler
3. **Database lookup** finds active recipients
4. **Forward to all** active recipients in parallel
5. **Bounce handling** if no active recipients

### **Recipient Management**

- **Add recipients** via SPA interface
- **Deactivate/reactivate** without deletion
- **Real-time updates** reflected immediately
- **Audit trail** via database timestamps

## 🗄️ **Database Schema**

```sql
-- D1 SQLite Database
CREATE TABLE recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🛠️ **Development Features**

### **Unified Vite Plugin Benefits**

- **Single Development Server** - No need to run multiple processes
- **Hot Module Replacement** - Instant updates without losing state
- **Production Parity** - Dev environment matches production exactly
- **Integrated Debugging** - Worker and SPA debugging in one place
- **Type Safety** - Full TypeScript support across stack

### **API Endpoints**

```http
GET    /api/recipients     # List all recipients
POST   /api/recipients     # Add new recipient
DELETE /api/recipients/:id # Deactivate recipient
```

### **Environment Variables**

```bash
# Development (via wrangler.toml)
NODE_ENV=development

# Production (set via Cloudflare dashboard)
NODE_ENV=production
```

## 🏗️ **Infrastructure**

### **Cloudflare Resources**

- **Worker** - `directors-worker` (unified SPA + API + email)
- **D1 Database** - `bardon-lodge-directors-[env]`
- **DNS/Email Routing** - `directors@bardon-lodge.org`
- **Access Application** - Zero Trust authentication
- **Custom Domain** - TBD

### **Terraform Management**

```bash
# Validate infrastructure
npm run tf:validate

# Plan changes
npm run tf:plan

# Apply infrastructure
npm run tf:apply
```

## 📊 **Testing**

### **Development Testing**

```bash
# Unit tests (Vitest)
npm test

# Manual API testing
curl http://localhost:5173/api/recipients
# Expected: {"status":403,"error":"Forbidden"} (auth required)

# SPA testing
open http://localhost:5173
# Expected: React app loads with recipient management UI
```

### **Production Testing**

```bash
# Preview production build
npm run preview

# Test preview API
curl http://localhost:4173/api/recipients

# Test SPA routing
curl http://localhost:4173/some-route
# Expected: Serves index.html (SPA routing)
```

## 🚀 **Deployment**

### **Staging Deployment**

```bash
npm run deploy:staging
# Deploys to: directors-worker.workers.dev
```

### **Production Deployment**

```bash
npm run deploy:prod
# Deploys to: production environment
```

### **Deployment Artifacts**

- **Worker Script** - `dist/directors_worker/index.mjs`
- **SPA Assets** - Automatically bundled with Worker
- **Configuration** - `dist/directors_worker/wrangler.json`

## 🔧 **Configuration Files**

### **Core Configuration**

- `wrangler.toml` - Worker, D1, and assets configuration
- `vite.config.mjs` - Unified Vite + Cloudflare plugin setup
- `package.json` - Dependencies and scripts for unified workflow

### **TypeScript Configuration**

- `tsconfig.json` - Project references for multiple environments
- `tsconfig.app.json` - SPA/React configuration
- `tsconfig.worker.json` - Worker environment configuration
- `tsconfig.node.json` - Node.js/Vite configuration

## 📚 **Architecture Benefits**

### **Developer Experience**

- **Single Command** - `npm run dev` starts everything
- **Fast Iteration** - HMR for both frontend and backend changes
- **Type Safety** - End-to-end TypeScript with proper Worker types
- **Production Parity** - Development matches production behavior

### **Performance**

- **Edge Deployment** - Global latency via Cloudflare's edge network
- **Serverless Scale** - Automatic scaling based on demand
- **Minimal Cold Starts** - V8 isolates for fast Worker initialization
- **Integrated Assets** - No separate CDN needed for SPA

### **Security**

- **Zero Trust** - Cloudflare Access integration
- **Edge Security** - DDoS protection and WAF included
- **Secrets Management** - Environment variables via Cloudflare
- **HTTPS Only** - TLS termination at edge

## 🎯 **Next Steps**

1. **Setup CI/CD** - GitHub Actions for automated deployment
2. **Custom Domain** - Configure production domain routing
3. **Monitoring** - Add error tracking and performance monitoring
4. **Email Templates** - Enhanced email formatting and routing rules

---

**Built with ❤️ using Cloudflare Workers, React, and the Vite Plugin for unified full-stack development.**
