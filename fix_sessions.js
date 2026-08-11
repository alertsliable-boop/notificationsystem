const fs = require('fs');
const path = require('path');

const files = [
  'src/app/(dashboard)/team/page.tsx',
  'src/app/(dashboard)/notifications/page.tsx',
  'src/app/(dashboard)/settings/page.tsx',
  'src/app/(dashboard)/notifications/[id]/page.tsx',
  'src/app/(dashboard)/dashboard/page.tsx',
  'src/app/(dashboard)/endpoints/[id]/page.tsx',
  'src/app/(dashboard)/billing/page.tsx',
  'src/app/(dashboard)/audit/page.tsx'
];

for (const file of files) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Add import { redirect } from 'next/navigation' if not exists and if we're replacing with redirect
    let modified = content;
    
    // Pattern to replace
    const p1 = "if (!session) return null;";
    const r1 = "if (!session?.user?.id) redirect('/login');";
    
    if (modified.includes(p1)) {
      modified = modified.replace(p1, r1);
      if (!modified.includes("import { redirect }")) {
        modified = "import { redirect } from 'next/navigation';\n" + modified;
      }
    }
    
    // Also handle billing page if it has different redirect
    const p2 = "if (!session) redirect('/login');";
    const r2 = "if (!session?.user?.id) redirect('/login');";
    if (modified.includes(p2)) {
      modified = modified.replace(p2, r2);
    }
    
    if (content !== modified) {
      fs.writeFileSync(fullPath, modified, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
}

// Fix api route
const apiFile = 'src/app/api/dashboard/stats/route.ts';
if (fs.existsSync(apiFile)) {
  let content = fs.readFileSync(apiFile, 'utf8');
  const p = "if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });";
  const r = "if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });";
  if (content.includes(p)) {
    fs.writeFileSync(apiFile, content.replace(p, r), 'utf8');
    console.log(`Updated ${apiFile}`);
  }
}
