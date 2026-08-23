const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const targetDir = 'D:/project/CDIDoorInd/src';

walkDir(targetDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check for useLanguage
    if (content.includes('useLanguage()') && !content.includes('import { useLanguage }')) {
      content = content.replace(/import { useState/, "import { useLanguage } from '@/contexts/LanguageContext';\nimport { useState");
      if (content.includes("import { useLanguage }")) {
         modified = true;
         console.log('Fixed useLanguage in', filePath);
      } else {
         // if useState is not there, put it at the top
         content = "import { useLanguage } from '@/contexts/LanguageContext';\n" + content;
         modified = true;
         console.log('Fixed useLanguage in', filePath);
      }
    }

    // Check for Badge (since it was missed earlier)
    if (content.includes('<Badge') && !content.includes('import { Badge }')) {
      content = "import { Badge } from '@/components/ui/badge';\n" + content;
      modified = true;
      console.log('Fixed Badge in', filePath);
    }
    
    // Check for DropdownMenuItem
    if (content.includes('<DropdownMenuItem') && !content.includes('DropdownMenuItem')) {
      // It might be imported as part of a block, so check carefully
      // This is a naive check but should catch if missing completely
       console.log('Potential missing DropdownMenuItem in', filePath);
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
    }
  }
});
