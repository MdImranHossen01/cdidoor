const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            results.push(file);
        }
    });
    return results;
}

const files = walk('D:/project/CDIDoorInd/src');
let count = 0;
files.forEach(f => {
    if (f.endsWith('.tsx') || f.endsWith('.ts')) {
        let cnt = fs.readFileSync(f, 'utf8');
        if (cnt.includes('@/context/LanguageContext')) {
            fs.writeFileSync(f, cnt.replace(/@\/context\/LanguageContext/g, '@/contexts/LanguageContext'));
            console.log('Fixed', f);
            count++;
        }
    }
});
console.log('Total fixed:', count);
