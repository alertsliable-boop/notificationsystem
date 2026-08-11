const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/**/+(page.tsx|route.ts)', { absolute: true });

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const newContent = content
    .replace(/\{ params \}: \{ params: \{ ([^}]+) \} \}/g, '{ params }: { params: Promise<{ $1 }> }')
    .replace(/const \{ ([^}]+) \} = params;/g, 'const { $1 } = await params;')
    .replace(/const ([a-zA-Z0-9_]+) = params\.([a-zA-Z0-9_]+);/g, 'const { $2: $1 } = await params;');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Fixed', file);
  }
});
