const { execSync } = require('child_process');

const originalContent = execSync('git show HEAD:src/app/(admin)/admin/ledger/page.tsx', { encoding: 'utf-8' });

const tableStart = originalContent.indexOf('{loading ? (');
const tableEnd = originalContent.indexOf('</CardContent>');
let tableCode = originalContent.substring(tableStart, tableEnd).trim();

// Check if tableCode is balanced!
let divCount = (tableCode.match(/<div/g) || []).length;
let divCloseCount = (tableCode.match(/<\/div>/g) || []).length;
console.log(`div count: ${divCount}`);
console.log(`div close count: ${divCloseCount}`);

let tableCount = (tableCode.match(/<Table>/g) || []).length;
let tableCloseCount = (tableCode.match(/<\/Table>/g) || []).length;
console.log(`Table count: ${tableCount}, close: ${tableCloseCount}`);

let rowCount = (tableCode.match(/<TableRow>/g) || []).length;
let rowCloseCount = (tableCode.match(/<\/TableRow>/g) || []).length;
console.log(`TableRow count: ${rowCount}, close: ${rowCloseCount}`);

let cellCount = (tableCode.match(/<TableCell/g) || []).length;
let cellCloseCount = (tableCode.match(/<\/TableCell>/g) || []).length;
console.log(`TableCell count: ${cellCount}, close: ${cellCloseCount}`);

let dropdownCount = (tableCode.match(/<DropdownMenu/g) || []).length;
let dropdownCloseCount = (tableCode.match(/<\/DropdownMenu>/g) || []).length;
console.log(`DropdownMenu count: ${dropdownCount}, close: ${dropdownCloseCount}`);

let badgeCount = (tableCode.match(/<Badge/g) || []).length;
let badgeCloseCount = (tableCode.match(/<\/Badge>/g) || []).length;
console.log(`Badge count: ${badgeCount}, close: ${badgeCloseCount}`);

