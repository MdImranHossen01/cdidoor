'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  HardDrive,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Loader2,
  FileQuestion,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

interface OrphanItem {
  key: string;
  filename: string;
  size: number;
  formattedSize: string;
  lastModified: string;
  url: string;
}

interface ScanData {
  prefix: string;
  totalObjects: number;
  totalSize: number;
  formattedTotalSize: string;
  orphanCount: number;
  orphanSize: number;
  formattedOrphanSize: string;
  orphans: OrphanItem[];
  scannedAt: string;
}

export function R2MediaCleaner() {
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [includeRecent, setIncludeRecent] = useState(false);

  const handleScan = async (forceRecent?: boolean | any) => {
    const useRecent = typeof forceRecent === 'boolean' ? forceRecent : includeRecent;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media/cleanup?minAgeMinutes=${useRecent ? 0 : 60}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setScanData(data);
        if (data.orphanCount === 0) {
          toast.success('Storage is completely clean! No orphan files found.');
        } else {
          toast.info(`Found ${data.orphanCount} unused file(s) taking ${data.formattedOrphanSize}.`);
        }
      } else {
        toast.error(data.message || 'Failed to scan Cloudflare R2 storage.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while scanning storage.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeSingle = async (item: OrphanItem) => {
    const confirm = await Swal.fire({
      title: 'Delete this unused image?',
      html: `Are you sure you want to permanently delete <b>${item.filename}</b> (${item.formattedSize}) from Cloudflare R2?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch('/api/admin/media/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: [item.key] }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Deleted ${item.filename}`);
        setScanData((prev) => {
          if (!prev) return null;
          const updatedOrphans = prev.orphans.filter((o) => o.key !== item.key);
          const newSize = Math.max(0, prev.orphanSize - item.size);
          return {
            ...prev,
            orphanCount: updatedOrphans.length,
            orphanSize: newSize,
            formattedOrphanSize: `${(newSize / 1024).toFixed(1)} KB`,
            orphans: updatedOrphans,
          };
        });
      } else {
        toast.error(data.message || 'Failed to delete file.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Deletion error.');
    }
  };

  const handlePurgeAll = async () => {
    if (!scanData || scanData.orphanCount === 0) return;

    const confirm = await Swal.fire({
      title: 'Purge all unused media?',
      html: `You are about to permanently delete <b>${scanData.orphanCount} unused image(s)</b> (${scanData.formattedOrphanSize}) from Cloudflare R2.<br/><br/><span style="color:#ef4444;font-size:12px;">Files not found in Products, Banners, Blogs, or Settings will be removed permanently.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Clean All Now',
      cancelButtonText: 'Cancel',
    });

    if (!confirm.isConfirmed) return;

    setPurging(true);
    try {
      const res = await fetch('/api/admin/media/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purgeAll: true, prefix: scanData.prefix, minAgeMinutes: includeRecent ? 0 : 60 }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        await Swal.fire({
          title: 'Storage Cleaned!',
          text: data.message,
          icon: 'success',
          confirmButtonColor: '#10b981',
        });
        setScanData({
          ...scanData,
          orphanCount: 0,
          orphanSize: 0,
          formattedOrphanSize: '0 Bytes',
          orphans: [],
        });
      } else {
        toast.error(data.message || 'Failed to clean storage.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while purging storage.');
    } finally {
      setPurging(false);
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HardDrive className="size-5 text-primary" />
              <CardTitle className="text-base font-bold">Cloudflare R2 Storage & Media Cleaner</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Scan and purge orphaned images (e.g., discarded product description drafts or deleted banners) that are no longer used in your database.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleScan}
              disabled={loading || purging}
              className="text-xs h-8 gap-1.5"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Scan Storage
            </Button>
            {scanData && scanData.orphanCount > 0 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handlePurgeAll}
                disabled={loading || purging}
                className="text-xs h-8 gap-1.5"
              >
                {purging ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Purge All Unused ({scanData.orphanCount})
              </Button>
            )}
          </div>
        </div>

        {/* Safety Guard Note */}
        <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex items-start justify-between gap-3 text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <ShieldAlert className="size-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-xs">Safety Guard Active</p>
              <p className="text-[11px] leading-relaxed opacity-90">
                Images uploaded within the last 60 minutes are automatically protected from deletion to prevent accidental removal while an admin is actively drafting a product.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-1.5 shrink-0 cursor-pointer pt-0.5">
            <input
              type="checkbox"
              checked={includeRecent}
              onChange={(e) => {
                const val = e.target.checked;
                setIncludeRecent(val);
                if (scanData) handleScan(val);
              }}
              className="rounded border-amber-500/50 text-primary size-3.5 focus:ring-primary"
            />
            <span className="text-[11px] font-medium">Scan Recent (&lt; 60m)</span>
          </label>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {scanData ? (
          scanData.orphanCount === 0 ? (
            <div className="py-8 border border-dashed rounded-xl bg-card text-center space-y-2">
              <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-foreground">Cloudflare R2 is 100% Clean</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                All {scanData.totalObjects} tracked objects in folder <code className="font-mono text-primary font-bold">{scanData.prefix}</code> ({scanData.formattedTotalSize}) are actively referenced in your database.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileQuestion className="h-4 w-4 text-rose-500" />
                  Unused Media Files Pending Cleanup ({scanData.orphanCount})
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Scanned: {new Date(scanData.scannedAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="border rounded-xl overflow-hidden divide-y divide-border bg-card">
                {scanData.orphans.map((orphan) => (
                  <div
                    key={orphan.key}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Image Thumbnail Preview */}
                      <div className="size-12 rounded-lg border bg-muted overflow-hidden relative shrink-0">
                        <Image
                          src={orphan.url}
                          alt={orphan.filename}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-foreground truncate max-w-md">
                          {orphan.filename}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-xs font-mono">
                          {orphan.key}
                        </p>
                        <div className="flex items-center gap-2 pt-0.5">
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                            {orphan.formattedSize}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(orphan.lastModified).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        asChild
                      >
                        <a href={orphan.url} target="_blank" rel="noopener noreferrer" title="View Full Image">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePurgeSingle(orphan)}
                        className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="py-10 border border-dashed rounded-xl bg-card text-center space-y-3">
            <div className="size-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Click "Scan Storage" to inspect Cloudflare R2</p>
              <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                The scanner will cross-check all bucket files against your MongoDB database to find draft images, abandoned uploads, and deleted product assets.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleScan}
              disabled={loading}
              className="text-xs h-8 gap-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Start Media Scan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

