# 🔐 How to Login - Complete Guide

## Test Credentials

### Demo Account:
```
Email: demo@liablealerts.com
Password: password123
```

---

## Step-by-Step Login Process

### 1. Make Sure Database is Setup

Check if you have a `.env` file:
```bash
ls -la .env
```

If it doesn't exist, copy from example:
```bash
cp .env.example .env
```

### 2. Configure Database (if needed)

Edit `.env` and make sure `DATABASE_URL` is set:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/liablealerts"
```

### 3. Run Database Migrations

```bash
npm run db:push
```

### 4. Seed the Database (Create Demo User)

```bash
npm run db:seed
```

This creates:
- ✅ Demo user: `demo@liablealerts.com`
- ✅ Demo company
- ✅ Subscription plans
- ✅ Platform domain

### 5. Start the Dev Server (if not running)

```bash
npm run dev
```

### 6. Login

1. Open browser: `http://localhost:3001/login`
2. Enter email: `demo@liablealerts.com`
3. Enter password: `password123`
4. Click "Sign in"

---

## If Login Fails

### Error: "Invalid email or password"

**Cause**: Demo user doesn't exist in database

**Fix**:
```bash
npm run db:seed
```

### Error: "Cannot connect to database"

**Cause**: Database not configured or not running

**Fix**:
1. Check `.env` file exists
2. Verify `DATABASE_URL` is correct
3. Make sure database is accessible

### Error: Page not loading

**Cause**: Dev server not running

**Fix**:
```bash
npm run dev
```

---

## Alternative: Create New Account

If you want to create a fresh account:

1. Go to: `http://localhost:3001/register`
2. Fill in:
   - Name
   - Email
   - Password
   - Company Name
3. Click "Start Free Trial"

---

## Quick Command Reference

```bash
# Copy environment file
cp .env.example .env

# Setup database
npm run db:push

# Create demo user
npm run db:seed

# Start server
npm run dev

# Then login at:
# http://localhost:3001/login
# Email: demo@liablealerts.com
# Password: password123
```

---

## Database Info

The seed file creates:

**Subscription Plans:**
- Solo: 1 endpoint - $9/mo
- Starter: 5 endpoints - $29/mo  
- Pro: 25 endpoints - $99/mo
- Business: 100 endpoints - $299/mo
- Enterprise: Unlimited - Custom

**Demo Account:**
- User: Demo Admin
- Email: demo@liablealerts.com
- Password: password123
- Company: Demo Company
- Plan: Starter (5 endpoints)
- Role: Owner

---

## Need Help?

1. **Check server is running**: Look for "Ready" message in terminal
2. **Check console**: Press F12 in browser, look for errors
3. **Try incognito**: Sometimes cache causes issues
4. **Restart everything**:
   ```bash
   # Stop server (Ctrl+C)
   rm -rf .next
   npm run dev
   ```

---

## ✅ Success Checklist

- [ ] `.env` file exists with DATABASE_URL
- [ ] Database migrations run: `npm run db:push`
- [ ] Database seeded: `npm run db:seed`
- [ ] Dev server running: `npm run dev`
- [ ] Browser at: `http://localhost:3001/login`
- [ ] Using credentials: `demo@liablealerts.com` / `password123`

---

**Once logged in, you'll see the beautiful new UI!** 🎉
