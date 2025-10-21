# Martina's Field - Horse Poo Lottery 🐎💰

A real-time horse poo lottery web application where participants buy grid squares and win prizes when the horse does its business in their square!

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd martinas-field
npm run setup

# Start development
npm run dev
```

Visit http://localhost:5173 to see the app!

## 🛠 Tech Stack

**Frontend:** React 19 + TypeScript + Vite + Mapbox GL  
**Backend:** Node.js + Express + TypeScript + Prisma  
**Database:** PostgreSQL + Redis  
**Real-time:** Socket.io WebSockets  
**Payments:** Stripe integration  

## 📁 Project Structure

```
martinas-field/
├── frontend/           # React app (Vite + TypeScript)
│   ├── src/
│   │   ├── components/    # React components  
│   │   ├── store/         # Zustand state management
│   │   └── config/        # Game configuration
├── backend/            # Node.js API (Express + TypeScript)
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── prisma.ts      # Database client
├── database/           # Prisma schema & migrations
│   └── prisma/
└── docker-compose.yml  # PostgreSQL + Redis
```

## ⚡ Development Setup

### Prerequisites
- **Node.js 18+** 
- **Docker & Docker Compose**
- **Git**

### Option 1: One Command Setup (Recommended)
```bash
git clone <repository-url>
cd martinas-field
npm run setup     # Installs deps + sets up database
npm run dev       # Starts everything
```

### Option 2: Manual Setup
```bash
# 1. Install dependencies
npm run install:all

# 2. Setup environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp database/.env.example database/.env

# 3. Start database services
npm run db:start

# 4. Setup database
npm run db:migrate
npm run db:seed

# 5. Start development servers
npm run dev:quick
```

### 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | 🚀 Start all services (DB + Backend + Frontend) |
| `npm run dev:quick` | ⚡ Start Backend + Frontend only |
| `npm run setup` | 📦 Full project setup (install + DB setup) |
| `npm run build` | 🏗️ Build for production |
| `npm run db:studio` | 🗄️ Open Prisma Studio (DB browser) |
| `npm run db:seed` | 🌱 Seed database with demo data |
| `npm run clean` | 🧹 Clean build artifacts |
| `npm run reset` | 🔄 Reset entire project |

## 🌐 Services

After running `npm run dev`:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001  
- **Database Browser:** http://localhost:5555
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

## 🎯 Key Features

- ✅ **Pay-First System** - Stripe integration with credit-based purchasing
- ✅ **Real-time Updates** - Live square selection via WebSockets  
- ✅ **Interactive Map** - Mapbox field visualization with clickable grid
- ✅ **Responsive Design** - Mobile-first, works on all devices
- ✅ **Multiple Payment Methods** - Card, Revolut, Cash credit codes
- ✅ **Admin Panel** - Game management and monitoring
- ✅ **Multi-winner Support** - Multiple poo events per game

## 🔑 Environment Configuration

### Backend (`.env`)
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/martinas_field"
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
JWT_SECRET="your-super-secret-jwt-key"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="changeme123"
```

### Frontend (`.env`)
```bash
VITE_MAPBOX_ACCESS_TOKEN="your_mapbox_token"
VITE_STRIPE_PUBLIC_KEY="pk_test_your_stripe_public_key"
VITE_API_URL="http://localhost:3001"
```

### Database (`.env`) 
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/martinas_field"
```

## 🏗️ Architecture

### Payment Flow
1. User selects payment method (Card/Revolut/Cash)
2. Payment processed via Stripe → Creates payment credit
3. User selects available square from map
4. Square marked as TAKEN, credit marked as USED

### Real-time Updates
- Socket.io WebSocket connections
- Live square selection updates
- Real-time prize announcements

### Database Schema
- **Events** - Game configurations
- **Squares** - 144 grid squares (12x12) 
- **PaymentCredits** - Pay-first system credits
- **SquarePurchases** - Square ownership records

## 🧪 Development Tips

### Database Management
```bash
npm run db:studio     # Browse data visually
npm run db:migrate    # Run new migrations
npm run db:seed       # Add demo data
npm run db:generate   # Update Prisma clients
```

### Debugging
```bash
# Backend logs
cd backend && npm run dev

# Check database
npm run db:studio

# Frontend dev tools
# Open http://localhost:5173 with browser dev tools
```

### Production Build
```bash
npm run build        # Build all services
npm run start         # Start production server
```

## 🚀 Deployment

Ready for production deployment with:
- Environment-based configuration
- TypeScript compilation
- Docker containerization
- Database migrations
- Static asset optimization

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test: `npm run dev`
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details

---

**Happy coding! 🎉** If you have questions, check the CLAUDE.md file for detailed development guidance.# Trigger Railway deployment
