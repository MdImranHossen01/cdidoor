const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(admin)/admin/dashboard/page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Replace state
content = content.replace(
  /const \[mobileTab, setMobileTab\] = useState\<'cards' \| 'charts'\>\('cards'\);/,
  "const [activeTab, setActiveTab] = useState<'cards' | 'report' | 'insight'>('cards');"
);

// 2. Replace the Tabs UI
const oldTabs = `{/* Mobile Tabs (only visible on mobile) */}
      <div className="flex md:hidden border border-muted/50 bg-muted/20 rounded-lg p-0.5 mt-2 gap-1">
        <button
          onClick={() => setMobileTab('cards')}
          className={\`flex-1 py-2 text-center text-xs font-extrabold rounded-md transition-all \${mobileTab === 'cards'
              ? 'bg-primary text-white shadow'
              : 'text-muted-foreground hover:bg-muted/50'
            }\`}
        >
          Overview Cards
        </button>
        <button
          onClick={() => setMobileTab('charts')}
          className={\`flex-1 py-2 text-center text-xs font-extrabold rounded-md transition-all \${mobileTab === 'charts'
              ? 'bg-primary text-white shadow'
              : 'text-muted-foreground hover:bg-muted/50'
            }\`}
        >
          Trends & Reports
        </button>
      </div>`;

const newTabs = `{/* Dashboard Tabs */}
      <div className="flex border border-muted/50 bg-muted/20 rounded-lg p-0.5 mt-2 gap-1 mb-4">
        <button
          onClick={() => setActiveTab('cards')}
          className={\`flex-1 py-2 text-center text-xs sm:text-sm font-extrabold rounded-md transition-all \${activeTab === 'cards'
              ? 'bg-primary text-white shadow'
              : 'text-muted-foreground hover:bg-muted/50'
            }\`}
        >
          Overview Cards
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={\`flex-1 py-2 text-center text-xs sm:text-sm font-extrabold rounded-md transition-all \${activeTab === 'report'
              ? 'bg-primary text-white shadow'
              : 'text-muted-foreground hover:bg-muted/50'
            }\`}
        >
          Report
        </button>
        <button
          onClick={() => setActiveTab('insight')}
          className={\`flex-1 py-2 text-center text-xs sm:text-sm font-extrabold rounded-md transition-all \${activeTab === 'insight'
              ? 'bg-primary text-white shadow'
              : 'text-muted-foreground hover:bg-muted/50'
            }\`}
        >
          Insight
        </button>
      </div>`;

content = content.replace(oldTabs, newTabs);

// 3. Replace containers
content = content.replace(
  /\<div className=\{\`grid gap-4 sm:gap-4 grid-cols-1 md:grid-cols-3 \$\{mobileTab === 'cards' \? 'grid' : 'hidden md:grid'\}\`\}\>/g,
  '<div className={`grid gap-4 sm:gap-4 grid-cols-1 md:grid-cols-3 ${activeTab === \'cards\' ? \'grid\' : \'hidden\'}`}>'
);

content = content.replace(
  /<div className=\{mobileTab === 'charts' \? 'space-y-6 block' : 'space-y-6 hidden md:block'\}>/g,
  '<div className={activeTab === \'report\' ? \'space-y-6 block\' : \'hidden\'}>'
);

content = content.replace(
  /<div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">/g,
  '<div className={activeTab === \'insight\' ? \'grid gap-4 md:grid-cols-1 lg:grid-cols-3\' : \'hidden\'}>'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Dashboard tabs updated successfully!');
