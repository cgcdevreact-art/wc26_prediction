import fs from 'fs';
import path from 'path';

function addUseClient(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      addUseClient(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('"use client"')) {
        fs.writeFileSync(fullPath, '"use client";\n\n' + content);
        console.log(`Added "use client" to ${fullPath}`);
      }
    }
  }
}

addUseClient('./src/components');
addUseClient('./src/hooks');
