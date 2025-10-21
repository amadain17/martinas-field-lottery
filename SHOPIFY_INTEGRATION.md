# Shopify Integration Guide

## Overview
This guide explains how to integrate the Horse Poo Lottery system with your Shopify store at `https://rathdrum-u16-girls.myshopify.com/`

## ✅ Implementation Complete

The lottery system has been updated to support Shopify Shop Pay integration:

### Backend Changes:
- Added Shopify webhook handler at `/api/payment/shopify/webhook`
- Added payment credit creation endpoint `/api/payment/shopify/create-credit`
- Added order checking endpoint `/api/payment/shopify/check-order/:orderId`

### Frontend Changes:
- Added `ShopifyPaymentButton` component for Shop Pay integration
- Added `ShopifyReturn` component for post-payment handling
- Updated `PaymentModal` to include Shop Pay as the recommended option

## 🛒 Shopify Store Setup Required

### Step 1: Create Lottery Product

1. **Log into your Shopify admin**: `https://rathdrum-u16-girls.myshopify.com/admin`
   - Email: `mfmdevine@gmail.com`
   - Password: `dsDNWjZUVWy4F5Fq-ETI`

2. **Create New Product**:
   - Go to Products → Add product
   - **Product Title**: "Horse Poo Lottery Square"
   - **Description**: 
     ```
     🐴 Join the Horse Poo Lottery!
     
     Buy a square on our field grid for just €10 and win €150 when the horse poos in your square!
     
     After purchasing, you'll be redirected to select your specific square position on the field.
     
     ⏰ You have 15 minutes after payment to select your square.
     🎯 Each square is 1m x 1m on Martina's Field.
     💰 Winner takes €150!
     ```
   - **Price**: €10.00
   - **Handle**: `horse-poo-lottery-square` (important - matches code)
   - **Product Type**: Digital
   - **Vendor**: Rathdrum U16 Girls
   - **Tags**: lottery, fundraising, digital

3. **Configure Product Settings**:
   - ✅ Enable "This is a physical product" = **NO** (it's digital)
   - ✅ Enable "Track quantity" = **NO** (unlimited squares available)
   - ✅ Enable "This product requires shipping" = **NO**
   - ✅ Enable Shop Pay = **YES**

### Step 2: Set Up Webhooks

1. **Go to Settings → Notifications**

2. **Create Webhook for Order Payment**:
   - **Event**: Order payment
   - **URL**: `https://your-lottery-domain.com/api/payment/shopify/webhook`
   - **Format**: JSON
   - **API Version**: Latest

### Step 3: Configure Return URLs

1. **In Product Settings**, add custom redirect:
   - **Success URL**: `https://your-lottery-domain.com/shopify-return?order_id={{order_id}}&event_id=YOUR_EVENT_ID`

### Step 4: Test Integration

1. **Create Test Order**:
   - Use Shopify's test mode
   - Purchase lottery square
   - Verify webhook receives order data
   - Confirm payment credit is created
   - Test square selection flow

## 🔧 Environment Variables

Add to your backend `.env`:

```bash
# Shopify Integration
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here
SHOPIFY_STORE_URL=https://rathdrum-u16-girls.myshopify.com
FRONTEND_URL=https://your-lottery-domain.com
```

## 🎯 Customer Experience Flow

1. **Customer visits lottery page** → Clicks "Buy Square"
2. **Redirected to Shopify product** → `horse-poo-lottery-square`
3. **Shop Pay checkout** → Fast, secure payment (€10.00)
4. **Payment confirmed** → Shopify processes payment
5. **Webhook triggered** → Creates payment credit in lottery system
6. **Customer redirected** → Back to lottery app
7. **Square selection** → Customer chooses position on field grid
8. **Entry complete** → Square reserved for customer

## 🛡️ Security Features

- **Shopify handles all payments** - PCI compliant, secure
- **Shop Pay integration** - Saved payment methods, instant checkout
- **Webhook verification** - Secure communication between systems
- **15-minute timeout** - Prevents indefinite square reservations
- **Order verification** - Backup creation if webhook fails

## 📱 Mobile Optimized

- **Responsive design** - Works on all devices
- **Shop Pay mobile app** - One-touch checkout for existing users
- **Touch-friendly grid** - Easy square selection on mobile

## 💡 Benefits

- **Faster checkout** - Shop Pay users checkout in seconds
- **Lower fees** - Shopify's competitive payment processing
- **Better security** - No need to handle card details
- **Order management** - All orders tracked in Shopify admin
- **Customer accounts** - Customers can view order history

## 🚀 Go Live Checklist

- [ ] Create "Horse Poo Lottery Square" product in Shopify
- [ ] Set product handle to `horse-poo-lottery-square`
- [ ] Configure webhooks for order payment
- [ ] Test with Shopify test mode
- [ ] Update environment variables
- [ ] Deploy lottery system with Shopify integration
- [ ] Test complete customer flow
- [ ] Monitor webhook logs for errors

## 📞 Support

If you encounter issues:
1. Check Shopify webhook logs in admin
2. Verify product handle matches code
3. Ensure webhook URL is accessible
4. Check payment credit creation in database

The integration is now ready to provide a seamless Shop Pay experience for your lottery customers!