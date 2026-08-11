# Quick Fix Guide - CSS Not Loading

## Problem
Tailwind styles are not being applied properly, causing the UI to look broken.

## Solutions

### Solution 1: Restart Development Server
The most common fix:

```bash
# Stop the current dev server (Ctrl+C)

# Clear Next.js cache
rm -rf .next

# Restart development server
npm run dev
```

### Solution 2: Check Tailwind v4 Configuration

Make sure your `postcss.config.mjs` looks like this:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

### Solution 3: Verify globals.css Import

Check that `src/app/layout.tsx` imports the globals.css:
```tsx
import './globals.css';
```

### Solution 4: Force Rebuild
```bash
# Remove all build artifacts
rm -rf .next
rm -rf node_modules/.cache

# Rebuild
npm run build

# Start dev server
npm run dev
```

### Solution 5: Check Browser Cache
- Hard refresh the browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or open in incognito/private mode

### Solution 6: Verify Package Installation
```bash
# Reinstall dependencies
npm install

# Make sure these packages are installed:
npm list tailwindcss
npm list @tailwindcss/postcss
```

## Expected Result

After fixing, you should see:
- ✅ White clean background
- ✅ Proper spacing and padding
- ✅ Rounded corners on cards
- ✅ Gradient buttons
- ✅ Proper typography
- ✅ Sidebar with blue accents
- ✅ Shadow effects on cards

## Still Not Working?

### Check for Console Errors
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab - look for failed CSS requests

### Verify File Structure
```
src/
├── app/
│   ├── globals.css  ← Must have @import "tailwindcss"
│   ├── layout.tsx   ← Must import './globals.css'
│   └── (dashboard)/
│       ├── layout.tsx
│       ├── dashboard/
│       │   └── page.tsx
│       └── billing/
│           └── page.tsx
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       └── Input.tsx
└── lib/
    └── utils.ts
```

### Manual Test
Create a test page to verify Tailwind is working:

```tsx
// src/app/test/page.tsx
export default function TestPage() {
  return (
    <div className="min-h-screen bg-blue-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900">Tailwind Works!</h1>
        <p className="text-gray-600 mt-2">If you see this styled, Tailwind is working.</p>
      </div>
    </div>
  );
}
```

Visit `http://localhost:3001/test` - if this page looks styled, Tailwind is working!

## Quick Diagnostic

Run this command to check if the build works:
```bash
npm run build
```

If you see errors, they'll tell you what's wrong.

## Need More Help?

1. Check the terminal where `npm run dev` is running
2. Look for TypeScript errors or missing imports
3. Make sure all icon imports are correct:
   ```tsx
   import { Mail, Activity, CheckCircle2 } from 'lucide-react';
   ```

## Common Errors & Fixes

### Error: "Cannot find module '@/components/ui/Button'"
**Fix:** Component file is missing or path is wrong
```bash
# Make sure this file exists:
ls src/components/ui/Button.tsx
```

### Error: "Module not found: Can't resolve '@/lib/utils'"
**Fix:** Create the utils file:
```bash
# File should exist at:
ls src/lib/utils.ts
```

### Error: Tailwind classes not working
**Fix:** Tailwind isn't processing the files
```bash
# Clear cache and rebuild
rm -rf .next
npm run dev
```

---

## Prevention

To avoid these issues in the future:
1. Always use `npm run dev` (not `next dev` directly)
2. Restart dev server after adding new files
3. Hard refresh browser after major changes
4. Keep dependencies up to date

---

**Most issues are solved by: Delete `.next` folder → Restart `npm run dev` → Hard refresh browser** 🔄
