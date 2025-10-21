# 🚀 Deployment Guide: Railway + Shopify Integration

## Overview
This guide will help you deploy the Horse Poo Lottery system using Railway (free hosting) + Shopify integration.

## 📋 Prerequisites
- GitHub account
- Railway account (free) - sign up at [railway.app](https://railway.app)
- Shopify admin access to `rathdrum-u16-girls.myshopify.com`

---

## 🗄️ Step 1: Deploy Database (Railway)

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Verify your account

### 1.2 Create PostgreSQL Database
1. **New Project** → **Provision PostgreSQL**
2. **Name**: `martinas-field-db`
3. **Copy Database URL** (you'll need this later)

---

## 🔧 Step 2: Deploy Backend (Railway)

### 2.1 Push Code to GitHub
```bash
# In your project directory
git init
git add .
git commit -m "Initial commit - Horse Poo Lottery"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/martinas-field.git
git push -u origin main
```

### 2.2 Deploy to Railway
1. **Railway Dashboard** → **New Project**
2. **Deploy from GitHub repo**
3. **Select your repository**
4. **Select "backend" folder** as root directory
5. **Deploy**

### 2.3 Configure Environment Variables
In Railway project settings, add these variables:

```bash
# Server
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://rathdrum-u16-girls.myshopify.com

# Database (use the URL from Step 1.2)
DATABASE_URL=postgresql://postgres:password@hostname:port/dbname

# Authentication (generate a secure 32+ character string)
JWT_SECRET=your_secure_jwt_secret_min_32_characters_here

# Payment Services
REVOLUT_API_KEY=revolut_placeholder_key
SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret

# CORS
ALLOWED_ORIGINS=https://rathdrum-u16-girls.myshopify.com
```

### 2.4 Run Database Migrations
In Railway terminal:
```bash
npx prisma migrate deploy
npx prisma db seed
```

### 2.5 Get Your Backend URL
- Railway will provide a URL like: `https://your-app-name.railway.app`
- **Copy this URL** - you'll need it for Shopify integration

---

## 🛒 Step 3: Set Up Shopify Integration

### 3.1 Create Lottery Product
1. **Log into Shopify Admin**: `https://rathdrum-u16-girls.myshopify.com/admin`
2. **Products** → **Add product**

**Product Details:**
```
Title: Horse Poo Lottery Square
Handle: horse-poo-lottery-square
Price: €10.00
Type: Digital
Description:
🐴 Join the Horse Poo Lottery!

Buy a square on our field grid for just €10 and win €150 when the horse poos in your square!

After purchasing, you'll be redirected to select your specific square position on the field.

⏰ You have 15 minutes after payment to select your square.
🎯 Each square is 1m x 1m on Martina's Field.
💰 Winner takes €150!
```

**Settings:**
- ✅ **Requires shipping**: NO
- ✅ **Track inventory**: NO
- ✅ **Shop Pay**: YES

### 3.2 Configure Webhooks
1. **Settings** → **Notifications**
2. **Webhooks** → **Create webhook**

**Webhook Configuration:**
```
Event: Order payment
URL: https://your-railway-app.railway.app/api/payment/shopify/webhook
Format: JSON
API Version: 2024-01 (latest)
```

---

## 🌐 Step 4: Deploy Frontend to Shopify

### 4.1 Build Frontend
```bash
cd frontend
npm run build
```

### 4.2 Create Shopify Page Template
1. **Online Store** → **Themes** → **Actions** → **Edit code**
2. **Templates** → **Add a new template**
3. **Type**: Page
4. **Name**: `lottery`

### 4.3 Upload Frontend Files
1. **Assets** → **Add a new asset**
2. Upload the built files from `frontend/dist/`
3. Update the lottery template to include your JavaScript

### 4.4 Create Lottery Page
1. **Online Store** → **Pages** → **Add page**
2. **Title**: "Horse Poo Lottery"
3. **Template**: lottery
4. **URL**: `/pages/lottery`

---

## 🧪 Step 5: Test Integration

### 5.1 Test Payment Flow
1. Visit `https://rathdrum-u16-girls.myshopify.com/pages/lottery`
2. Click "Buy Square with Shop Pay"
3. Complete test purchase
4. Verify redirect to square selection
5. Select a square
6. Confirm square is reserved

### 5.2 Verify Webhook
1. Check Railway logs for webhook received
2. Verify payment credit created in database
3. Test square selection timeout (15 minutes)

---

## 🔍 Step 6: Monitor & Troubleshoot

### 6.1 Check Logs
- **Railway**: View logs in Railway dashboard
- **Shopify**: Check webhook delivery status

### 6.2 Common Issues
- **CORS errors**: Update ALLOWED_ORIGINS in Railway
- **Database connection**: Verify DATABASE_URL
- **Webhook failures**: Check URL and secrets

---

## 🎯 Go Live Checklist

- [ ] Database deployed and migrated
- [ ] Backend deployed to Railway
- [ ] Environment variables configured
- [ ] Shopify product created
- [ ] Webhooks configured
- [ ] Frontend deployed to Shopify
- [ ] Test purchase completed
- [ ] Square selection tested
- [ ] Error monitoring set up

---

## 📞 Support URLs

- **Frontend**: `https://rathdrum-u16-girls.myshopify.com/pages/lottery`
- **Backend**: `https://your-app-name.railway.app`
- **Database**: Railway dashboard
- **Admin**: `https://your-app-name.railway.app/api/admin`

**Your lottery system will be live and taking payments through Shopify with full functionality!**