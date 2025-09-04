# PayPal Subscription Setup Guide

## 🎯 What's Implemented

✅ **Discord OAuth Login** - Users sign in with Discord  
✅ **PayPal Subscription System** - Works in USA and Brasil  
✅ **Payment Flow** - Login → Payment → Dashboard  
✅ **Subscription Management** - Check active subscriptions  
✅ **Success/Cancel Pages** - Handle payment outcomes  

## 🔧 Setup Instructions

### 1. Environment Variables
Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

### 2. Discord App Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 settings
4. Add redirect URI: `http://localhost:3141/api/auth/callback/discord`
5. Copy Client ID and Secret to `.env.local`

### 3. PayPal Setup
1. Go to [PayPal Developer](https://developer.paypal.com/)
2. Create a new app (sandbox for testing)
3. Copy Client ID and Secret to `.env.local`
4. Create subscription plans in PayPal Dashboard:
   - Monthly Plan ($6.99/month)
   - Yearly Plan ($49.99/year)
5. Copy Plan IDs to `.env.local`

### 4. Run the Application
```bash
npm run dev
```

## 🌊 User Flow

1. **Login Page** (`/login`) - Discord OAuth
2. **Subscription Check** - Automatic after login
3. **Payment Page** (`/payment`) - If no active subscription
4. **Success Page** (`/payment/success`) - After successful payment
5. **Dashboard** (`/`) - Main app (subscription required)

## 📊 Payment Integration

### PayPal Features:
- ✅ Subscription billing
- ✅ Works in USA and Brasil
- ✅ Local payment methods supported
- ✅ Webhook handling (basic)
- ✅ Cancel/Success flows

### Next Steps:
- Set up a database for subscription storage
- Implement proper webhook verification
- Add subscription management (cancel, upgrade)
- Connect to actual Discord bot backend

## 🔗 Key Files

- `app/payment/page.tsx` - Payment selection and PayPal integration
- `app/api/paypal/create-subscription/route.ts` - Subscription creation API
- `lib/subscription.ts` - Subscription management logic
- `lib/paypal.ts` - PayPal configuration

## 🚀 Ready to Test!

The system is ready for testing with PayPal sandbox. Users will:
1. Login with Discord
2. Get redirected to payment if no subscription
3. Choose a plan and pay with PayPal
4. Access the dashboard after successful payment