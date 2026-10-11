'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Printer,
  FileText,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SalesDeleteLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const [currentPage, setCurrentPage] = useState(initialPage);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/sales-delete-log`);
      if (!res.ok) throw new Error('Failed to fetch delete logs');
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      toast.error('Failed to load delete logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    return log.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-8 w-full max-w-full overflow-x-hidden">
      
      {/* Filter and Search */}
      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6 print:hidden">
        <div className="bg-white border rounded-md p-2">
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ইনঃ নং"
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span>শো হবে</span>
                <select 
                  className="border rounded p-1"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>এন্ট্রিস</span>
              </div>
              <Button onClick={handlePrint} size="sm" className="bg-teal-600 hover:bg-teal-700">
                <Printer className="mr-2 h-4 w-4" /> প্রিন্ট
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bill List */}
      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
        <div className="rounded-md md:border md:bg-background overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-10 w-10 mb-2 stroke-1" />
            <p>কোনো ডিলিট লগ পাওয়া যায়নি</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ইনঃ নং</TableHead>
                    <TableHead>তারিখ</TableHead>
                    <TableHead className="text-right">মোট</TableHead>
                    <TableHead className="text-right">পেইড</TableHead>
                    <TableHead className="text-right">বাকি</TableHead>
                    <TableHead>ডিলিটের তারিখ</TableHead>
                    <TableHead>ডিলিট বাই</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="font-bold text-blue-600">
                        {log.invoiceNo}
                      </TableCell>
                      <TableCell>{format(new Date(log.date), 'dd-MMM-yyyy')}</TableCell>
                      <TableCell className="text-right font-semibold">{log.gTotal}</TableCell>
                      <TableCell className="text-right">{log.cashIn}</TableCell>
                      <TableCell className="text-right">{log.currentBillDue}</TableCell>
                      <TableCell>
                        {format(new Date(log.deletedAt), 'dd-MMM-yyyy hh:mm a')}
                      </TableCell>
                      <TableCell>{log.deletedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden space-y-3 print:block">
              {paginatedLogs.map((log) => (
                <div key={log._id} className="p-3 mb-3 border border-border/50 rounded-md bg-card shadow-sm flex flex-col gap-2 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-border/30">
                    <span className="font-semibold">ইনঃ নং</span>
                    <span className="text-blue-600">{log.invoiceNo}</span>
                  </div>
                  <div className="flex justify-end items-center py-1 border-b border-border/30">
                    <span>{format(new Date(log.date), 'dd-MMM-yyyy')}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/30">
                    <span className="font-semibold">মোট</span>
                    <span>{log.gTotal}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/30">
                    <span className="font-semibold">পেইড</span>
                    <span>{log.cashIn}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/30">
                    <span className="font-semibold">বাকি</span>
                    <span>{log.currentBillDue}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/30">
                    <span className="font-semibold">ডিলিটের তারিখ</span>
                    <span>{format(new Date(log.deletedAt), 'dd-MMM-yyyy hh:mm a')}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="font-semibold">ডিলিট বাই</span>
                    <span>{log.deletedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-4 print:hidden">
            <span className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
