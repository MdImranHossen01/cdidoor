const fs = require('fs');
const file = 'D:/project/CDIDoorInd/src/app/(employee)/employee/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix string interpolation for line 106
content = content.replace(/'{t\('store.employee.monthly_staff'\) \|\| '[^']+'}'/g, "(t('store.employee.monthly_staff') || 'মাসিক কর্মী')");
content = content.replace(/'{t\('store.employee.contractual_staff'\) \|\| '[^']+'}'/g, "(t('store.employee.contractual_staff') || 'চুক্তিভিত্তিক কর্মী')");

// Fix missing braces for title= and sub=
content = content.replace(/title=(t\([^)]+\)\s*\|\|\s*'[^']+')/g, 'title={$1}');
content = content.replace(/sub=(t\([^)]+\)\s*\|\|\s*'[^']+')/g, 'sub={$1}');

fs.writeFileSync(file, content);
console.log('Fixed dashboard page');
