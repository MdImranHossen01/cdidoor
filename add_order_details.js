const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src/app/(admin)/admin/ledger/page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Import OrderDetailsDialog
if (!content.includes('import OrderDetailsDialog')) {
  content = content.replace(
    /import \{ Tabs, TabsList, TabsTrigger, TabsContent \} from '@\/components\/ui\/tabs';/,
    `import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';\nimport OrderDetailsDialog from '@/components/admin/OrderDetailsDialog';`
  );
}

// 2. Add State for OrderDetailsDialog
if (!content.includes('selectedOrderId')) {
  content = content.replace(
    /const \[isTxOpen, setIsTxOpen\] = useState\(false\);/,
    `const [isTxOpen, setIsTxOpen] = useState(false);\n  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);\n  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);`
  );
}

// 3. Make reference clickable in Desktop view (line ~575)
content = content.replace(
  /\{tx\.reference && \(\s*<span className="text-\[10px\] bg-muted px-1\.5 py-0\.5 rounded font-semibold text-muted-foreground uppercase">\s*\{t\("ledger\.ref"\)\}: \{tx\.reference\}\s*<\/span>\s*\)\}/,
  `{tx.reference && (
                              <span 
                                onClick={() => {
                                  if (tx.reference.startsWith('ORDER-')) {
                                    setSelectedOrderId(tx.reference.replace('ORDER-', ''));
                                    setIsOrderDetailsOpen(true);
                                  }
                                }}
                                className={\`text-[10px] bg-muted px-1.5 py-0.5 rounded font-semibold uppercase \${tx.reference.startsWith('ORDER-') ? 'text-primary cursor-pointer hover:underline' : 'text-muted-foreground'}\`}
                              >
                                {t("ledger.ref")}: {tx.reference}
                              </span>
                            )}`
);

// 4. Make reference clickable in Mobile view (line ~649)
// It has the EXACT same HTML structure in the source code according to my grep logs.
// However, to be safe since I just replaced the first occurrence, I'll do it globally for the same block.
content = content.replace(
  /\{tx\.reference && \(\s*<span className="text-\[10px\] bg-muted px-1\.5 py-0\.5 rounded font-semibold text-muted-foreground uppercase">\s*\{t\("ledger\.ref"\)\}: \{tx\.reference\}\s*<\/span>\s*\)\}/g,
  `{tx.reference && (
                              <span 
                                onClick={() => {
                                  if (tx.reference.startsWith('ORDER-')) {
                                    setSelectedOrderId(tx.reference.replace('ORDER-', ''));
                                    setIsOrderDetailsOpen(true);
                                  }
                                }}
                                className={\`text-[10px] bg-muted px-1.5 py-0.5 rounded font-semibold uppercase \${tx.reference.startsWith('ORDER-') ? 'text-primary cursor-pointer hover:underline' : 'text-muted-foreground'}\`}
                              >
                                {t("ledger.ref")}: {tx.reference}
                              </span>
                            )}`
);

// 5. Render OrderDetailsDialog at the bottom (before final div)
if (!content.includes('<OrderDetailsDialog')) {
  content = content.replace(
    /<\/div>\s*\);\s*\}\s*export default function AccountsLedgerPage/,
    `
      <OrderDetailsDialog
        orderId={selectedOrderId}
        open={isOrderDetailsOpen}
        onOpenChange={setIsOrderDetailsOpen}
      />
    </div>
  );
}

export default function AccountsLedgerPage`
  );
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Added order details modal correctly');
