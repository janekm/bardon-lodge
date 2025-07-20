# Directors Admin SPA

React-based Single Page Application for managing email recipients for the directors@bardonlodge.co.uk alias.

## Features

- ✅ List all current recipients
- ✅ Add new recipients (with email validation)
- ✅ Remove recipients (with confirmation)
- ✅ Real-time status updates (Active/Inactive)
- ✅ Responsive design for mobile and desktop
- ✅ Error handling with user-friendly messages
- ✅ Modern UI with clean styling

## Development

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## API Integration

The SPA communicates with the Directors Worker API:

- `GET /api/recipients` - Fetch all recipients
- `POST /api/recipients` - Add new recipient
- `DELETE /api/recipients/:id` - Remove recipient

## Authentication

Protected by Cloudflare Access. Users must be authenticated and be active recipients to access the admin interface.

## Deployment

The SPA is now served directly by the Cloudflare Worker using static assets. The deployment process:

1. Build process runs `npm run build` in the `/spa` directory
2. Static files are output to `/spa/dist/`
3. Worker serves SPA assets automatically using `assets.not_found_handling = "single-page-application"`
4. API routes (`/api/*`) are handled by the Worker script
5. All other navigation requests serve the SPA

### Unified Architecture

```
Single Cloudflare Worker:
├── API Routes (/api/*)     → Worker script handles
├── Navigation requests     → Serves index.html (SPA)
├── Static assets          → Serves from spa/dist/
└── Email handling         → Worker script handles
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **CSS3** - Modern styling with responsive design
- **Fetch API** - HTTP requests to worker API
- **Cloudflare Workers** - Unified hosting and API platform
