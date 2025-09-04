# Discord Bot Projects Reference

## Project Paths
- **RedM Discord Bot:** `C:\Users\jizar\OneDrive\Documents\DiscordBot`
- **Fazenda Web Application:** `C:\Users\jizar\OneDrive\Documents\Fazenda\Webbased`

---

## Project 1: RedM Discord Bot
**Path:** `C:\Users\jizar\OneDrive\Documents\DiscordBot`

### Overview
A comprehensive Discord bot for managing RedM (Red Dead Redemption Online RP) servers with an integrated web dashboard. The project is designed for game server management with extensive Discord integration.

### Technical Details
- **Version:** 0.001
- **Main Entry:** `src/index.ts`
- **Language:** TypeScript
- **Package Manager:** npm

### Key Features
1. **Discord Bot Integration**
   - Slash commands for server management
   - Real-time server status monitoring
   - Player management commands
   - Role synchronization
   - Path: `src/bot/`

2. **Web Dashboard**
   - Built with Next.js
   - Real-time server statistics
   - Player management interface
   - Server configuration panel
   - Analytics and logs viewer
   - Path: `frontend/`

3. **Command Categories**
   - Info Commands: `/ping`, `/help`, `/about`
   - RedM Commands: `/status`, `/players`, `/playerinfo`
   - Admin Commands: `/restart`, `/kick`, `/ban`, `/whitelist`
   - Farm Commands: `submit-service.ts`, `pay.ts`
   - Path: `src/bot/commands/`

4. **Specialized Systems**
   - Farm Management System (`src/bot/commands/farm/`)
   - Order Processing (`src/bot/commands/orders/`)
   - Moderation Tools (`src/bot/commands/moderation/`)
   - Admin Controls (`src/bot/commands/admin/`)

### Technology Stack
- **Backend:**
  - TypeScript
  - Discord.js v14
  - Express v5
  - Socket.io
  - MongoDB with Mongoose
  - PM2 for process management
  
- **Frontend:**
  - Next.js
  - React
  - TypeScript
  - Tailwind CSS
  - Socket.io-client

- **Additional Tools:**
  - Tesseract.js for OCR capabilities
  - Sharp for image processing
  - JWT for authentication
  - Multer for file uploads
  - Node-cron for scheduled tasks

### API Structure
- `GET /api/status` - Server status
- `GET /api/players` - Player list
- `GET /api/bot/stats` - Bot statistics
- `POST /api/players/:id/kick` - Kick player
- `POST /api/players/:id/ban` - Ban player
- Path: `src/api/`

### Project Structure
```
DiscordBot/
├── src/
│   ├── bot/           # Discord bot logic
│   │   ├── commands/  # Bot commands
│   │   ├── events/    # Discord events
│   │   └── utils/     # Bot utilities
│   ├── api/           # REST API
│   │   ├── routes/    # API routes
│   │   └── middleware/# Express middleware
│   ├── services/      # Business logic
│   ├── models/        # Database models
│   ├── config/        # Configuration
│   └── index.ts       # Entry point
├── frontend/          # Next.js dashboard
│   ├── app/          # App router
│   ├── components/   # React components
│   ├── hooks/        # Custom hooks
│   ├── lib/          # Utilities
│   └── types/        # TypeScript types
├── data/             # Data storage
├── uploads/          # File uploads
├── scripts/          # Utility scripts
└── extension/        # Browser extension
```

### Development Files
- Configuration: `.env`, `.env.local`, `tsconfig.json`
- Documentation: `README.md`, `CLAUDE.md`, `changelog.md`, `devlog.md`
- Scripts: Various cleanup and sync scripts in root directory

---

## Project 2: Fazenda Web Application
**Path:** `C:\Users\jizar\OneDrive\Documents\Fazenda\Webbased`

### Overview
A web-based farm management system focused on business operations, inventory tracking, and data analytics with Google Sheets integration.

### Technical Details
- **Version:** 1.0.0
- **Main Entry:** `server.js`
- **Language:** JavaScript (Node.js)
- **Port:** 8086

### Key Features
1. **Data Management System**
   - Comprehensive DataManager module
   - File-based storage system
   - Real-time data synchronization
   - Path: `server/DataManager.js`

2. **Google Integration**
   - Google Sheets API for data sync
   - Google Auth for authentication
   - Path: `server/GoogleSheetsClient.js`

3. **Business Modules**
   - Payment Processing (`server/PaymentProcessor.js`)
   - Pricing Management (`server/PricingManager.js`)
   - User Management (`server/UserManager.js`)
   - Data Analytics (`server/DataAnalyzer.js`)
   - Master Log Monitoring (`server/MasterLogMonitor.js`)

4. **API Endpoints**
   - Inventory: `/api/inventario`, `/api/inventory`
   - Users: `/api/usuarios`, `/api/users`
   - Pricing: `/api/precos`, `/api/pricing`
   - Managers: `/api/managers`, `/api/gerentes`
   - Railroad: `/api/ferroviaria`
   - Analytics: `/api/analytics`
   - Stock: `/api/stock`
   - Payments: `/api/payments`
   - Discord Logs: `/api/discord-logs`
   - Bot Data: `/api/bot-data`
   - Path: `server/routes/`

### Technology Stack
- **Backend:**
  - Node.js
  - Express v4
  - Socket.io
  - Google APIs
  - Winston for logging
  - Axios for HTTP requests
  
- **Frontend:**
  - React (Create React App)
  - Built static files in `client/build/`

- **Data Management:**
  - File-based storage (`data/` directory)
  - Google Sheets integration
  - Real-time synchronization via Socket.io

### Project Structure
```
Fazenda/Webbased/
├── server/
│   ├── routes/        # API routes
│   ├── services/      # Service modules
│   ├── utils/         # Utility functions
│   ├── DataManager.js # Core data handler
│   ├── DataAnalyzer.js
│   ├── GoogleSheetsClient.js
│   ├── MasterLogMonitor.js
│   ├── PaymentProcessor.js
│   ├── PricingManager.js
│   └── UserManager.js
├── client/
│   ├── build/        # Production build
│   ├── public/       # Static assets
│   └── src/          # React source
├── data/             # File-based storage
├── logs/             # Application logs
├── server.js         # Main server file
└── ecosystem.config.js # PM2 configuration
```

### Key Differences from RedM Bot
1. **Purpose:** Business management vs game server management
2. **Language:** JavaScript vs TypeScript
3. **Database:** File-based + Google Sheets vs MongoDB
4. **Discord:** Logging only vs full bot integration
5. **Frontend:** React CRA vs Next.js
6. **Focus:** Data processing vs command handling

---

## Common Features Between Projects
- Real-time updates using Socket.io
- Express-based API servers
- Farm-related functionality
- Discord integration (different levels)
- Web dashboards
- User management systems
- Payment/transaction processing

## Development Notes
- Both projects use nodemon for development
- PM2 is available for production deployment
- Both have extensive logging systems
- Similar route structure patterns
- Both handle file uploads and processing

## Quick Access Commands
### RedM Discord Bot
```bash
cd "C:\Users\jizar\OneDrive\Documents\DiscordBot"
npm run dev        # Development mode
npm run build      # Build TypeScript
npm start          # Production mode
npm run typecheck  # Type checking
npm run lint       # Linting
```

### Fazenda Web
```bash
cd "C:\Users\jizar\OneDrive\Documents\Fazenda\Webbased"
npm run dev        # Development mode
npm start          # Production mode
npm run build      # Build client
```

## Important Files to Check
### RedM Discord Bot
- Config: `src/config/config.ts`
- Bot Client: `src/bot/BotClient.ts`
- API Server: `src/api/server.ts`
- Database: `src/services/DatabaseService.ts`

### Fazenda Web
- Data Manager: `server/DataManager.js`
- Routes: `server/routes/`
- Services: `server/services/`
- Client App: `client/src/`