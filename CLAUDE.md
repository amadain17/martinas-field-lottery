# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Martina's Field is a horse poo lottery web application where participants buy grid squares and win prizes when the horse poos in their square. It's a full-stack application with React frontend, Node.js backend, and PostgreSQL database.

## Common Development Commands

### Database (from database/ directory)
- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate dev` - Run database migrations  
- `npx prisma studio` - Open database browser

### Backend (from backend/ directory)
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

### Frontend (from frontend/ directory)
- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production (TypeScript + Vite)
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Infrastructure
- `docker-compose up -d postgres redis` - Start database services
- `docker-compose down` - Stop all services

## Architecture

### High-level Structure
```
martinas-field/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/    # React components
│   │   └── main.tsx       # Entry point
├── backend/           # Node.js + Express + TypeScript
│   ├── src/              # Source code (empty in current state)
│   └── package.json      # Dependencies: Express, Prisma, Socket.io, Stripe
├── database/          # Prisma schema and migrations  
│   └── prisma/schema.prisma
└── docker-compose.yml # PostgreSQL + Redis
```

### Technology Stack

**Frontend:**
- React 19 with TypeScript
- Vite for build tooling and dev server
- Mapbox GL for interactive field visualization
- Zustand for state management
- Socket.io client for real-time updates
- Stripe.js for payments

**Backend:**
- Node.js with Express and TypeScript
- Prisma ORM with PostgreSQL database
- Socket.io for real-time WebSocket communication
- Stripe for payment processing
- JWT for authentication
- bcrypt for password hashing

**Database:**
- PostgreSQL with PostGIS extension for geospatial data
- Redis for caching and sessions

### Key Features Architecture

**Pay-First System:** Users pay via Stripe before selecting squares, creating payment credits that can be used for square selection with timeout handling.

**Real-time Updates:** Socket.io WebSocket connections provide live updates for square selections and poo events.

**Geospatial Grid:** Mapbox integration with PostGIS for field visualization and coordinate-based square management.

**Multi-winner Support:** Database schema supports multiple poo events per lottery with configurable prize distribution.

## Development Workflow

1. Start database: `docker-compose up -d postgres redis`
2. Setup database: `cd database && npx prisma migrate dev`
3. Start backend: `cd backend && npm run dev` (port 3001)
4. Start frontend: `cd frontend && npm run dev` (port 5173)

## Code Conventions

- TypeScript strict mode enabled across all projects
- Backend uses CommonJS modules
- Frontend uses ES modules with Vite
- Database schema follows snake_case naming
- API endpoints follow REST conventions with /api prefix

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.