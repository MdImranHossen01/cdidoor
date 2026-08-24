const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', '(employee)', 'employee', 'salary', 'page.tsx');
let lines = fs.readFileSync(filePath, 'utf-8').split('\n');

const newContent = `              {selectedDisbursement?.title || 'Payment Summary'}
            </DialogDescription>
          </DialogHeader>

          {selectedDisbursement && (
            <div className="space-y-4 py-2 text-sm">
              {/* Employee Info Header */}
              <div className="bg-muted/40 p-3 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-foreground">{session?.user?.name}</div>
                  <div className="text-muted-foreground">{session?.user?.email}</div>
                </div>
                <Badge variant="outline" className="font-mono">
                  {selectedDisbursement.date ? format(new Date(selectedDisbursement.date), 'dd MMM yyyy') : 'N/A'}
                </Badge>
              </div>

              {/* Details */}
              <div className="space-y-2 border rounded-lg p-3.5 bg-background">
                <div className="flex justify-between items-center py-1 border-b text-xs">
                  <span className="text-muted-foreground">{t('store.employee.payment_type') || 'Payment Type:'}</span>
                  <span className="font-bold">{getDisbursementTypeLabel(selectedDisbursement.category).label}</span>
                </div>
                
                <div className="flex justify-between items-center py-1 border-b text-xs">
                  <span className="text-muted-foreground">Title:</span>
                  <span className="font-medium text-right max-w-[200px]">{selectedDisbursement.title}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b text-xs">
                  <span className="text-muted-foreground">{t('store.employee.remarks_details') || 'Description:'}</span>
                  <span className="text-right max-w-[200px]">{selectedDisbursement.description || '—'}</span>
                </div>
              </div>

              {/* Total Net Paid */}
              <div className="bg-primary/10 border border-primary/20 p-3.5 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-primary">{t('store.employee.net_paid') || 'Net Paid'}</div>
                  <div className="text-[10px] text-muted-foreground">Disbursed by Admin</div>
                </div>
                <div className="text-xl font-black text-primary">
                  {fmt(selectedDisbursement.amount)}
                </div>
              </div>
            </div>
          )}`;

lines.splice(354, 156, newContent); // 355 is index 354, delete to line 510 (510 - 355 + 1 = 156 lines)
fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
console.log('Successfully replaced lines!');
