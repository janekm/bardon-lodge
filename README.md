# Bardon Lodge Directors Email Alias

A modern, full-stack email alias management system for directors@bardonlodge.co.uk, built with Cloudflare Workers, React, and infrastructure-as-code.

## 🎯 Overview

This system provides an intelligent email alias that forwards messages to multiple directors while offering a web-based admin interface for recipient management. The solution is serverless, secure, and fully automated using a single Cloudflare Worker.

### Key Features

- ✅ **Smart Email Forwarding** - Fan-out incoming emails to all active recipients
- ✅ **Admin Web Interface** - React SPA for managing recipients
- ✅ **Cloudflare Access Security** - Zero Trust authentication  
- ✅ **Infrastructure as Code** - Terraform for reliable deployments
- ✅ **Serverless Architecture** - No servers to maintain
- ✅ **Unified Worker Platform** - Single Worker handles API, SPA, and email
- ✅ **Modern Tech Stack** - TypeScript, React 18, Cloudflare Workers

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Email Sender  │───▶│  Cloudflare MX   │───▶│   Directors Worker  │
└─────────────────┘    │   Email Routing  │    │  ┌───────────────┐  │
                       └──────────────────┘    │  │ Email Handler │  │
                                               │  └───────────────┘  │
┌─────────────────┐    ┌──────────────────┐    │  ┌───────────────┐  │
│   Admin User    │───▶│ Browser Request  │───▶│  │  API Routes   │  │
└─────────────────┘    │  (Navigation)    │    │  │   (/api/*)    │  │
                       └──────────────────┘    │  └───────────────┘  │
                                               │  ┌───────────────┐  │
                                               │  │  SPA Assets   │  │
                                               │  │  (React UI)   │  │
                                               │  └───────────────┘  │
                                               └─────────────────────┘
                                                         │
                                                         ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Cloudflare Access│◀───│  D1 Database    │
                       │  (Zero Trust)    │    │  (Recipients)   │
                       └──────────────────┘    └─────────────────┘
```

### Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Unified Worker** | Cloudflare Workers | Handles emails, API, and serves SPA |
| **Email Handler** | Workers Email Routing | Processes incoming emails and forwards to recipients |
| **Admin API** | Workers API Routes | RESTful API for recipient management |
| **Admin UI** | React 18 + TypeScript | Web interface for managing recipients |
| **Static Assets** | Workers Assets | Serves SPA files from /spa/dist/ |
| **Database** | Cloudflare D1 | Stores recipient data |
| **Authentication** | Cloudflare Access | Zero Trust security |
| **Infrastructure** | Terraform | Infrastructure as Code |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Cloudflare account
- Terraform (for infrastructure)

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd bardon-lodge
   npm install
   cd spa && npm install && cd ..
   ```

2. **Configure Cloudflare:**
   ```bash
   # Set up Wrangler authentication
   npx wrangler login
   
   # Create D1 database
   npx wrangler d1 create directors-db
   
   # Update wrangler.toml with database ID
   ```

3. **Deploy infrastructure:**
   ```bash
   cd infrastructure
   terraform init
   terraform plan
   terraform apply
   ```

4. **Deploy application:**
   ```bash
   # Build and deploy worker with SPA assets
   npm run deploy:staging
   npx wrangler d1 migrations apply directors-db
   ```

## 🛠️ Development

### Worker Development
```bash
# Start local development server (includes SPA)
npm run dev

# Run tests
npm test

# Deploy to staging
npm run deploy:staging
```

### SPA Development
```bash
# Start SPA development server (standalone)
npm run spa:dev

# Build SPA for production
npm run spa:build

# Preview production build
npm run spa:preview
```

### Infrastructure Management
```bash
# Validate Terraform configuration
npm run tf:validate

# Plan infrastructure changes
npm run tf:plan

# Apply infrastructure changes
npm run tf:apply
```

## 📁 Project Structure

```
bardon-lodge/
├── src/                    # 🔧 Cloudflare Worker source code
│   ├── index.ts           # Main worker entry point
│   ├── auth.ts            # Authentication helpers
│   └── index.test.ts      # Worker tests
├── spa/                   # 🌐 React Admin SPA
│   ├── src/               # React source code
│   ├── dist/              # Built files (served by Worker)
│   └── package.json       # SPA dependencies
├── infrastructure/        # 🏗️ Terraform infrastructure
│   ├── main.tf            # Main configuration
│   ├── dns.tf             # DNS and email routing
│   ├── access.tf          # Cloudflare Access setup
│   └── variables.tf       # Input variables
├── migrations/            # 🗄️ Database migrations
│   └── 0001_initial_schema.sql
├── wrangler.toml          # Worker configuration (includes assets)
├── package.json           # Worker dependencies
└── README.md              # This file
```

## 🔒 Security

- **Zero Trust Authentication** - Cloudflare Access protects the admin interface
- **Database Validation** - API access requires authenticated user to be an active recipient
- **Input Validation** - Email addresses validated before database operations
- **HTTPS Only** - All traffic encrypted in transit

## 🌐 API Reference

### Recipients API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/recipients` | List all recipients |
| `POST` | `/api/recipients` | Add new recipient |
| `DELETE` | `/api/recipients/:id` | Remove recipient |

### Authentication
All API endpoints require:
- Valid Cloudflare Access authentication
- Authenticated user must be an active recipient

## 📊 Testing

### Worker Tests
```bash
npm test
```
- ✅ 7 comprehensive tests
- ✅ Email forwarding logic
- ✅ CRUD operations
- ✅ Authentication flows
- ✅ Error handling

### Manual Testing Checklist
- [ ] Send email to directors@bardonlodge.co.uk
- [ ] Verify fan-out to all active recipients
- [ ] Test admin SPA functionality
- [ ] Verify Cloudflare Access protection

## 🚢 Deployment

### Environments

| Environment | Worker | SPA | Database |
|-------------|--------|-----|----------|
| **Development** | `wrangler dev` | Served by Worker | Local D1 |
| **Staging** | `directors-worker` | Served by Worker | D1 Production |
| **Production** | `directors-worker` | Served by Worker | D1 Production |

### Deployment Workflow

1. **Code changes** → Push to GitHub
2. **Build & Deploy** → `npm run deploy:staging`
   - Builds SPA assets
   - Deploys Worker with assets
   - Serves unified application
3. **Infrastructure changes** → `terraform apply`

### Unified Worker Deployment

The deployment process automatically:
- Builds React SPA (`npm run spa:build`)
- Outputs assets to `spa/dist/`
- Deploys Worker with assets configuration
- Serves SPA for navigation requests
- Handles `/api/*` routes with Worker script

## 🏆 Implementation Status

- ✅ **7 out of 9 priorities completed (78% done!)**
- ✅ Full-stack implementation complete
- ✅ Modern React SPA with excellent UX  
- ✅ Production-ready with comprehensive testing
- ✅ Unified Worker architecture
- 🔄 Only CI/CD and final testing remaining

See [`backlog.md`](backlog.md) for detailed progress tracking.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

Private project for Bardon Lodge operations.

## 🆘 Support

For questions or issues:
1. Check the [`backlog.md`](backlog.md) for known issues
2. Review component-specific READMEs:
   - [`infrastructure/README.md`](infrastructure/README.md) - Infrastructure setup
   - [`spa/README.md`](spa/README.md) - SPA development
3. Open an issue for bugs or feature requests

---

**Built with ❤️ using Cloudflare's unified edge platform** 