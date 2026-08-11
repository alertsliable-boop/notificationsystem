import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Mail, Bell, CheckCircle } from 'lucide-react';

export default function DesignTestPage() {
  return (
    <div className="min-h-screen bg-ash-mist p-8">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-ink-black mb-2">Portal Design System</h1>
          <p className="text-graphite">Testing all components with the new design</p>
        </div>

        {/* Buttons Section */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons - Portal Pills</CardTitle>
            <CardDescription>All buttons use 50px border radius (full pills)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary Button</Button>
              <Button variant="primary" icon={<Mail className="w-4 h-4" />}>With Icon</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="lg">Large</Button>
              <Button variant="primary" isLoading>Loading</Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-signal-blue/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-signal-blue" />
                </div>
                <Badge variant="blue">Active</Badge>
              </div>
              <h3 className="font-semibold text-ink-black mb-1">Portal Card</h3>
              <p className="text-smoke text-sm">Cards have 22px radius with glow rings</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <Badge variant="success">Success</Badge>
              </div>
              <h3 className="font-semibold text-ink-black mb-1">Status Cards</h3>
              <p className="text-smoke text-sm">Clean surfaces with subtle shadows</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-purple-600" />
                </div>
                <Badge variant="info">Info</Badge>
              </div>
              <h3 className="font-semibold text-ink-black mb-1">Notification</h3>
              <p className="text-smoke text-sm">Consistent spacing and typography</p>
            </CardContent>
          </Card>
        </div>

        {/* Badges Section */}
        <Card>
          <CardHeader>
            <CardTitle>Badges - Portal Pills</CardTitle>
            <CardDescription>Status indicators with subtle fills</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="blue">Blue</Badge>
              <Badge variant="neutral">Neutral</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Colors Section */}
        <Card>
          <CardHeader>
            <CardTitle>Portal Color Palette</CardTitle>
            <CardDescription>Achromatic system with Signal Blue accent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="w-full h-20 bg-signal-blue rounded-nav mb-2"></div>
                <p className="text-sm font-medium">Signal Blue</p>
                <p className="text-xs text-smoke">#007aff</p>
              </div>
              <div>
                <div className="w-full h-20 bg-ink-black rounded-nav mb-2"></div>
                <p className="text-sm font-medium">Ink Black</p>
                <p className="text-xs text-smoke">#000000</p>
              </div>
              <div>
                <div className="w-full h-20 bg-graphite rounded-nav mb-2"></div>
                <p className="text-sm font-medium">Graphite</p>
                <p className="text-xs text-smoke">#3e3e3e</p>
              </div>
              <div>
                <div className="w-full h-20 bg-smoke rounded-nav mb-2"></div>
                <p className="text-sm font-medium">Smoke</p>
                <p className="text-xs text-smoke">#636363</p>
              </div>
              <div>
                <div className="w-full h-20 bg-paper-white border border-ash-mist rounded-nav mb-2"></div>
                <p className="text-sm font-medium">Paper White</p>
                <p className="text-xs text-smoke">#ffffff</p>
              </div>
              <div>
                <div className="w-full h-20 bg-ash-mist rounded-nav mb-2"></div>
                <p className="text-sm font-medium">Ash Mist</p>
                <p className="text-xs text-smoke">#f7f7f7</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography Section */}
        <Card>
          <CardHeader>
            <CardTitle>Typography Scale</CardTitle>
            <CardDescription>Inter font with tight letter-spacing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-display font-bold text-ink-black">Display 48px</p>
              <p className="text-xs text-smoke">line-height: 1.0</p>
            </div>
            <div>
              <p className="text-heading font-bold text-ink-black">Heading 36px</p>
              <p className="text-xs text-smoke">line-height: 1.0</p>
            </div>
            <div>
              <p className="text-heading-sm font-semibold text-ink-black">Heading SM 18px</p>
              <p className="text-xs text-smoke">line-height: 1.35, letter-spacing: -0.36px</p>
            </div>
            <div>
              <p className="text-body text-graphite">Body 16px - This is the main body text size with comfortable reading line-height</p>
              <p className="text-xs text-smoke">line-height: 1.35, letter-spacing: -0.32px</p>
            </div>
            <div>
              <p className="text-body-sm text-graphite">Body SM 14px - Used for secondary text and UI elements</p>
              <p className="text-xs text-smoke">line-height: 1.3, letter-spacing: -0.28px</p>
            </div>
            <div>
              <p className="text-caption text-smoke">Caption 12px - For metadata and helper text</p>
              <p className="text-xs text-smoke">line-height: 1.2, letter-spacing: -0.24px</p>
            </div>
          </CardContent>
        </Card>

        {/* Glow Effect Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Portal Glow Effect</CardTitle>
            <CardDescription>Signature elevation style - glow rings instead of shadows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-paper-white rounded-card shadow-portal-glow">
                <p className="font-medium mb-1">Glow Ring</p>
                <p className="text-sm text-smoke">5px ash-mist halo</p>
              </div>
              <div className="p-6 bg-paper-white rounded-card shadow-portal-card">
                <p className="font-medium mb-1">Portal Card Shadow</p>
                <p className="text-sm text-smoke">Inset + outline combo</p>
              </div>
              <div className="p-6 bg-paper-white rounded-card shadow-portal-subtle">
                <p className="font-medium mb-1">Subtle Outline</p>
                <p className="text-sm text-smoke">1px ash-mist border</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
