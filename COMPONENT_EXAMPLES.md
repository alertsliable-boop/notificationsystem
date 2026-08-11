# Component Usage Examples

Quick reference for using the new UI components throughout the Liable Alerts platform.

## 🔘 Button Component

### Import
```tsx
import { Button } from '@/components/ui/Button';
```

### Examples
```tsx
// Primary button (most common actions)
<Button variant="primary">
  Create New Endpoint
</Button>

// With icon
<Button variant="primary" icon={<Plus className="w-4 h-4" />}>
  Add Recipient
</Button>

// Loading state
<Button variant="primary" isLoading>
  Saving...
</Button>

// Different sizes
<Button variant="primary" size="sm">Small</Button>
<Button variant="primary" size="md">Medium</Button>
<Button variant="primary" size="lg">Large</Button>

// Secondary actions
<Button variant="secondary">
  Cancel
</Button>

// Outline style
<Button variant="outline">
  View Details
</Button>

// Ghost (minimal)
<Button variant="ghost">
  Learn More
</Button>

// Destructive actions
<Button variant="danger">
  Delete Endpoint
</Button>

// Disabled state
<Button variant="primary" disabled>
  Unavailable
</Button>
```

## 🃏 Card Components

### Import
```tsx
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/Card';
```

### Examples
```tsx
// Standard card
<Card>
  <CardHeader>
    <CardTitle>Recent Notifications</CardTitle>
    <CardDescription>Latest alerts from your endpoints</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Your content here */}
  </CardContent>
</Card>

// Card with footer actions
<Card>
  <CardHeader>
    <CardTitle>Upgrade Plan</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Get access to more endpoints</p>
  </CardContent>
  <CardFooter>
    <Button variant="primary">Upgrade Now</Button>
  </CardFooter>
</Card>

// Clickable card with hover effect
<Card hover className="cursor-pointer">
  <CardContent className="p-6">
    <h3>Click me!</h3>
  </CardContent>
</Card>

// Stat card pattern
<Card>
  <CardContent className="p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
        <Mail className="w-6 h-6 text-blue-600" />
      </div>
      <Badge variant="success">+12%</Badge>
    </div>
    <p className="text-sm font-medium text-gray-600 mb-1">Active Endpoints</p>
    <p className="text-3xl font-bold text-gray-900">24</p>
  </CardContent>
</Card>
```

## 🏷️ Badge Component

### Import
```tsx
import { Badge } from '@/components/ui/Badge';
```

### Examples
```tsx
// Success state
<Badge variant="success">Active</Badge>
<Badge variant="success">Delivered</Badge>
<Badge variant="success">Healthy</Badge>

// Warning state
<Badge variant="warning">Pending</Badge>
<Badge variant="warning">Near Limit</Badge>
<Badge variant="warning">Expiring Soon</Badge>

// Danger/Error state
<Badge variant="danger">Failed</Badge>
<Badge variant="danger">Inactive</Badge>
<Badge variant="danger">Error</Badge>

// Info state
<Badge variant="info">Processing</Badge>
<Badge variant="info">Sending</Badge>
<Badge variant="info">Most Popular</Badge>

// Neutral state
<Badge variant="neutral">Draft</Badge>
<Badge variant="neutral">5 Recipients</Badge>
<Badge variant="neutral">Archived</Badge>

// With icons
<Badge variant="success">
  <CheckCircle2 className="w-3 h-3 mr-1" />
  Verified
</Badge>
```

## 📝 Input Component

### Import
```tsx
import { Input } from '@/components/ui/Input';
```

### Examples
```tsx
// Basic input with label
<Input
  label="Email Address"
  type="email"
  placeholder="you@company.com"
  required
/>

// With icon
<Input
  label="Search"
  type="text"
  placeholder="Search endpoints..."
  icon={<Search className="w-4 h-4" />}
/>

// With helper text
<Input
  label="Company Name"
  type="text"
  helperText="This will be displayed on your account"
/>

// With error message
<Input
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
/>

// Controlled input
const [email, setEmail] = useState('');

<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// Disabled input
<Input
  label="Account ID"
  type="text"
  value="ACC-12345"
  disabled
/>
```

## 🎨 Common Patterns

### Page Header
```tsx
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
  <div>
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Title</h1>
    <p className="text-gray-600">Page description goes here</p>
  </div>
  <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
    Primary Action
  </Button>
</div>
```

### Stats Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <Activity className="w-6 h-6 text-blue-600" />
        </div>
        <Badge variant="success">+5%</Badge>
      </div>
      <p className="text-sm font-medium text-gray-600 mb-1">Metric Name</p>
      <p className="text-3xl font-bold text-gray-900">1,234</p>
    </CardContent>
  </Card>
  {/* Repeat for other stats */}
</div>
```

### Loading State
```tsx
{loading ? (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
) : (
  <YourContent />
)}
```

### Empty State
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
    <Mail className="w-8 h-8 text-gray-400" />
  </div>
  <h3 className="font-bold text-lg text-gray-900 mb-2">No items yet</h3>
  <p className="text-gray-600 mb-6 max-w-md">
    Get started by creating your first item
  </p>
  <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
    Create First Item
  </Button>
</div>
```

### Form Layout
```tsx
<form onSubmit={handleSubmit} className="space-y-6">
  <Input
    label="Name"
    type="text"
    required
    value={name}
    onChange={(e) => setName(e.target.value)}
  />
  
  <Input
    label="Email"
    type="email"
    required
    icon={<Mail className="w-4 h-4" />}
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />

  <div className="flex gap-3 justify-end">
    <Button variant="outline" type="button">
      Cancel
    </Button>
    <Button variant="primary" type="submit" isLoading={isSubmitting}>
      Save Changes
    </Button>
  </div>
</form>
```

### Alert/Notification Banner
```tsx
// Success
<div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
  <div className="flex items-start gap-3">
    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
    <div>
      <h3 className="font-semibold text-green-800 mb-1">Success!</h3>
      <p className="text-sm text-green-700">Your changes have been saved</p>
    </div>
  </div>
</div>

// Error
<div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
  <div className="flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
    <div>
      <h3 className="font-semibold text-red-800 mb-1">Error</h3>
      <p className="text-sm text-red-700">Something went wrong. Please try again.</p>
    </div>
  </div>
</div>

// Warning
<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
  <div className="flex items-start gap-3">
    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
    <div>
      <h3 className="font-semibold text-yellow-800 mb-1">Warning</h3>
      <p className="text-sm text-yellow-700">You're approaching your plan limit</p>
    </div>
  </div>
</div>
```

### Modal Pattern
```tsx
{showModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Confirm Action</CardTitle>
        <CardDescription>Are you sure you want to continue?</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">This action cannot be undone.</p>
      </CardContent>
      <CardFooter className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => setShowModal(false)}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm}>
          Confirm
        </Button>
      </CardFooter>
    </Card>
  </div>
)}
```

### Search Bar
```tsx
<div className="relative">
  <Input
    type="text"
    placeholder="Search..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    icon={<Search className="w-4 h-4" />}
  />
  {searchQuery && (
    <button
      onClick={() => setSearchQuery('')}
      className="absolute right-3 top-1/2 -translate-y-1/2"
    >
      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
    </button>
  )}
</div>
```

### Status Indicator
```tsx
// With dot and text
<div className="flex items-center gap-2">
  <div className={`w-2 h-2 rounded-full ${
    status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300'
  }`} />
  <span className="text-sm font-medium">
    {status === 'ACTIVE' ? 'Active' : 'Inactive'}
  </span>
</div>

// With badge
<Badge variant={status === 'DELIVERED' ? 'success' : 'danger'}>
  {status}
</Badge>
```

### Two-Column Layout
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Main content - 2/3 width */}
  <div className="lg:col-span-2">
    <Card>
      <CardHeader>
        <CardTitle>Main Content</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Content */}
      </CardContent>
    </Card>
  </div>
  
  {/* Sidebar - 1/3 width */}
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Sidebar Item 1</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Sidebar content */}
      </CardContent>
    </Card>
  </div>
</div>
```

## 🚀 Pro Tips

1. **Consistent Spacing**: Always use Tailwind's spacing scale (4, 6, 8, etc.)
2. **Icon Sizing**: Use `w-4 h-4` for inline icons, `w-6 h-6` for larger UI elements
3. **Loading States**: Always provide visual feedback for async operations
4. **Empty States**: Never show an empty table/list without helpful messaging
5. **Accessibility**: Add aria-labels to icon-only buttons
6. **Responsive**: Test all layouts on mobile, tablet, and desktop
7. **Hover States**: Interactive elements should always have hover feedback

## 📚 Additional Resources

- **Tailwind CSS Docs**: https://tailwindcss.com
- **Lucide Icons**: https://lucide.dev
- **Accessibility Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **ClickSend Inspiration**: https://dashboard.clicksend.com/

---

**Need Help?** Check the `DESIGN_GUIDE.md` for design system details and `UI_IMPROVEMENTS.md` for implementation overview.
