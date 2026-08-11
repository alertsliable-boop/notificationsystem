# Liable Alerts - Design System Guide

## 🎨 Design Inspiration
This platform draws inspiration from **ClickSend's** clean, modern dashboard design, featuring:
- White-themed interface with subtle shadows
- Blue as the primary brand color
- Card-based layouts
- Clear information hierarchy
- Professional B2B SaaS aesthetic

## 🌈 Color System

### Primary Colors
```css
Blue 600: #2563EB  /* Primary actions, links, accents */
Blue 700: #1D4ED8  /* Hover states, darker accents */
Blue 500: #3B82F6  /* Info badges, secondary elements */
Blue 100: #DBEAFE  /* Light backgrounds, subtle highlights */
Blue 50:  #EFF6FF  /* Lightest background accents */
```

### Semantic Colors
```css
/* Success */
Green 500: #10B981  /* Success states, delivered status */
Green 600: #059669  /* Success hover states */
Green 100: #D1FAE5  /* Success backgrounds */

/* Warning */
Yellow 500: #EAB308  /* Warning states, approaching limits */
Yellow 600: #CA8A04  /* Warning hover states */
Yellow 100: #FEF3C7  /* Warning backgrounds */

/* Danger */
Red 500: #EF4444  /* Error states, failed status */
Red 600: #DC2626  /* Error hover states */
Red 100: #FEE2E2  /* Error backgrounds */

/* Neutral */
Gray 900: #111827  /* Primary text */
Gray 700: #374151  /* Secondary text */
Gray 600: #4B5563  /* Tertiary text */
Gray 500: #6B7280  /* Muted text */
Gray 400: #9CA3AF  /* Disabled text, placeholders */
Gray 300: #D1D5DB  /* Borders */
Gray 200: #E5E7EB  /* Light borders */
Gray 100: #F3F4F6  /* Subtle backgrounds */
Gray 50:  #F9FAFB  /* Page background, hover states */
```

## 📐 Spacing System
Based on 8px grid:
```
xs:  4px   (0.5 rem)
sm:  8px   (1 rem)
md:  16px  (2 rem)
lg:  24px  (3 rem)
xl:  32px  (4 rem)
2xl: 48px  (6 rem)
3xl: 64px  (8 rem)
```

## 🔤 Typography

### Font Family
```css
Primary: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell
Monospace: 'Monaco', 'Courier New', monospace  /* For email addresses, code */
```

### Font Sizes
```css
xs:   0.75rem  (12px)  /* Small labels, helper text */
sm:   0.875rem (14px)  /* Body text, form inputs */
base: 1rem     (16px)  /* Default body text */
lg:   1.125rem (18px)  /* Large body text */
xl:   1.25rem  (20px)  /* Small headings */
2xl:  1.5rem   (24px)  /* Section headings */
3xl:  1.875rem (30px)  /* Page headings */
4xl:  2.25rem  (36px)  /* Hero headings */
```

### Font Weights
```css
normal:   400  /* Body text */
medium:   500  /* Emphasized text */
semibold: 600  /* Subheadings, buttons */
bold:     700  /* Headings, important labels */
extrabold: 800 /* Hero text, large numbers */
```

## 🎯 Component Patterns

### Buttons
```tsx
// Primary Action - Use for main CTAs
<Button variant="primary">Create Endpoint</Button>

// Secondary Action - Use for less important actions
<Button variant="secondary">Cancel</Button>

// Outline - Use for tertiary actions
<Button variant="outline">Export Data</Button>

// Ghost - Use for inline actions
<Button variant="ghost">View Details</Button>

// Danger - Use for destructive actions
<Button variant="danger">Delete Account</Button>
```

### Cards
```tsx
// Standard Card
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter>
    {/* Actions or metadata */}
  </CardFooter>
</Card>

// Hover Effect Card
<Card hover>
  {/* Lifts on hover, use for clickable cards */}
</Card>
```

### Badges
```tsx
// Status Indicators
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Failed</Badge>
<Badge variant="info">Processing</Badge>
<Badge variant="neutral">Inactive</Badge>
```

### Form Inputs
```tsx
// With Label and Icon
<Input
  label="Email Address"
  type="email"
  placeholder="you@company.com"
  icon={<Mail className="w-4 h-4" />}
  helperText="We'll never share your email"
  required
/>

// With Error State
<Input
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
/>
```

## 📱 Responsive Breakpoints
```css
sm:  640px   /* Small tablets */
md:  768px   /* Tablets */
lg:  1024px  /* Small laptops */
xl:  1280px  /* Desktops */
2xl: 1536px  /* Large desktops */
```

### Mobile-First Approach
```tsx
// Stack on mobile, side-by-side on desktop
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

## 🎭 Animation & Transitions

### Standard Transitions
```css
/* All interactive elements */
transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

/* Colors only (faster) */
transition: background-color 150ms, color 150ms;
```

### Animation Classes
```tsx
// Fade in on page load
<div className="animate-fadeIn">...</div>

// Slide in from top
<div className="animate-slideIn">...</div>

// Pulse effect (for live updates)
<div className="animate-pulse">...</div>

// Spinning loader
<Loader2 className="animate-spin" />
```

## 🖼️ Layout Patterns

### Dashboard Stats Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {stats.map(stat => (
    <StatCard key={stat.id} {...stat} />
  ))}
</div>
```

### Two-Column Layout
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    {/* Main content - 2/3 width */}
  </div>
  <div>
    {/* Sidebar - 1/3 width */}
  </div>
</div>
```

### Page Container
```tsx
<div className="max-w-[1400px] mx-auto p-8">
  {/* Page content */}
</div>
```

## 🎪 Status Indicators

### Endpoint Status
```tsx
// Active
<div className="w-2 h-2 bg-green-500 rounded-full" />
<Badge variant="success">Active</Badge>

// Inactive
<div className="w-2 h-2 bg-gray-300 rounded-full" />
<Badge variant="neutral">Inactive</Badge>
```

### SMS Delivery Status
```tsx
// Delivered
<div className="w-2 h-2 bg-green-500 rounded-full" />

// Failed
<div className="w-2 h-2 bg-red-500 rounded-full" />

// Sending
<div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />

// Queued
<div className="w-2 h-2 bg-yellow-500 rounded-full" />
```

## 🔔 Notification Patterns

### Success Message
```tsx
<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
  <p className="text-sm text-green-600 font-medium">
    Endpoint created successfully!
  </p>
</div>
```

### Error Message
```tsx
<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
  <p className="text-sm text-red-600 font-medium">
    Failed to save changes. Please try again.
  </p>
</div>
```

### Warning Message
```tsx
<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
  <p className="text-sm text-yellow-600 font-medium">
    You're near your plan limit. Consider upgrading.
  </p>
</div>
```

## 📊 Data Display

### Table Styling
```tsx
<table className="w-full">
  <thead className="bg-gray-50 border-y border-gray-200">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
        Header
      </th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-100">
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">Data</td>
    </tr>
  </tbody>
</table>
```

### Stat Card
```tsx
<Card>
  <CardContent className="p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
        <Icon className="w-6 h-6 text-blue-600" />
      </div>
      <Badge variant="success">+12%</Badge>
    </div>
    <p className="text-sm font-medium text-gray-600 mb-1">Label</p>
    <p className="text-3xl font-bold text-gray-900">1,234</p>
  </CardContent>
</Card>
```

## ♿ Accessibility Guidelines

### Focus States
```css
/* All interactive elements should have visible focus */
:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
  border-radius: 4px;
}
```

### Color Contrast
- Text on white: Minimum gray-700 (#374151)
- Small text: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- Interactive elements: Clear hover/focus states

### ARIA Labels
```tsx
<button aria-label="Copy email address">
  <Copy className="w-4 h-4" />
</button>

<input aria-describedby="email-help" />
<span id="email-help">We'll never share your email</span>
```

## 🎯 Best Practices

### DO ✅
- Use consistent spacing (8px grid)
- Provide loading states for async actions
- Show clear success/error feedback
- Use semantic HTML elements
- Maintain color contrast standards
- Test with keyboard navigation
- Provide alt text for images
- Use descriptive button labels

### DON'T ❌
- Mix different button styles unnecessarily
- Use color as the only indicator
- Create layouts wider than 1400px
- Forget hover states on clickable elements
- Use more than 3 font weights on a page
- Nest cards more than 2 levels deep
- Use animations longer than 300ms
- Leave forms without validation feedback

## 🚀 Performance Tips
- Use CSS transitions instead of JavaScript animations
- Lazy load images and heavy components
- Debounce search inputs
- Optimize bundle size with tree shaking
- Use proper image formats (WebP when possible)
- Minimize layout shifts (CLS)
- Preload critical fonts

---

**Pro Tip**: When in doubt, refer to ClickSend's dashboard for inspiration. Our design maintains their clean, professional aesthetic while adding our own brand identity.
