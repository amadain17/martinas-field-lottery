# Development Guide

## 🚀 Quick Setup

```bash
# Clone and setup everything
git clone <repository-url>
cd martinas-field
npm run setup
npm run dev
```

## 🛠 Development Tools

### Recommended VS Code Extensions
- Prettier (Code formatting)
- ESLint (Code linting)
- Prisma (Database schema)
- TypeScript (Language support)
- Path Intellisense (Auto path completion)

### Scripts Overview

| Script | Purpose | Location |
|--------|---------|----------|
| `npm run setup` | Full project setup | Root |
| `npm run dev` | Start all services | Root |
| `npm run db:studio` | Database browser | Root |
| `npm run clean` | Clean build files | Root |

## 📊 Database Development

### Prisma Workflow
```bash
# Make schema changes in database/prisma/schema.prisma
npm run db:migrate    # Create migration
npm run db:generate   # Update clients
npm run db:seed       # Add demo data
```

### Viewing Data
```bash
npm run db:studio     # Opens http://localhost:5555
```

## 🔧 Environment Setup

### Required Environment Variables

**Backend (.env):**
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/martinas_field"
STRIPE_SECRET_KEY="sk_test_..."
JWT_SECRET="your-secret-key"
```

**Frontend (.env):**
```bash
VITE_MAPBOX_ACCESS_TOKEN="pk...."
VITE_STRIPE_PUBLIC_KEY="pk_test_..."
```

### Getting API Keys

1. **Stripe**: Sign up at https://stripe.com/
   - Copy test keys from Dashboard → Developers → API keys
   
2. **Mapbox**: Sign up at https://mapbox.com/
   - Create access token from Account → Access tokens

## 🐛 Debugging

### Backend Issues
```bash
cd backend
npm run dev          # Check console for errors
```

### Frontend Issues
```bash
cd frontend
npm run dev          # Check browser console
```

### Database Issues
```bash
npm run db:studio    # Visual database browser
docker logs postgres-temp  # Database logs
```

## 🧪 Testing

### Manual Testing Workflow
1. Start all services: `npm run dev`
2. Open http://localhost:5173
3. Try payment flow (use Stripe test cards)
4. Check square selection
5. Verify real-time updates

### Test Payment Cards (Stripe)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Use any future date for expiry, any 3 digits for CVC

## 📦 Production Build

```bash
npm run build        # Build all services
npm run start         # Start production server
```

## 🔄 Common Tasks

### Adding New Features
1. Update database schema (if needed)
2. Run migrations: `npm run db:migrate`
3. Update backend API routes
4. Update frontend components
5. Test with `npm run dev`

### Database Schema Changes
1. Edit `database/prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Run `npm run db:generate`
4. Update seed script if needed

### Resetting Everything
```bash
npm run reset        # Nuclear option - resets everything
npm run setup        # Setup again
```

## 🏗️ Architecture Notes

### Payment Flow
1. Frontend → Stripe → Payment Intent
2. Backend stores payment credit
3. User selects square
4. Credit marked as used

### Real-time Updates
- Socket.io WebSocket connections
- Events: square selection, payment confirmation
- Auto-reconnection handling

### File Structure
```
src/
├── components/     # React components
├── store/         # Zustand state management
├── services/      # API calls
└── types/         # TypeScript types
```

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
lsof -ti:5432 | xargs kill -9  # PostgreSQL
```

### Database Connection Issues
```bash
# Restart Docker containers
npm run db:stop
npm run db:start
```

### Clean Install
```bash
npm run clean
rm -rf node_modules package-lock.json
npm install
```

## 💡 Tips

- Use `npm run db:studio` to visually inspect database
- Check browser console for frontend errors
- Check terminal for backend errors
- Use Stripe test mode for development
- Enable browser dev tools for debugging