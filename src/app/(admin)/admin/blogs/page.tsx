'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    ExternalLink, 
    Loader2,
    Newspaper,
    DatabaseZap
} from 'lucide-react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import Image from 'next/image';
import { Pagination } from '@/components/ui/pagination';
import { useLanguage } from '@/contexts/LanguageContext';

interface BlogListItem {
  _id: string;
  title: string;
  slug: string;
  thumbnail?: string;
  createdAt: string;
  isPublished: boolean;
  views?: number;
}

function BlogsContent() {
  const { t } = useLanguage();
  const [blogs, setBlogs] = useState<BlogListItem[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const limit = 10;

  const fetchBlogs = async (page = currentPage) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/blogs?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (res.ok) {
        setBlogs(data.blogs || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      } else {
        toast.error(data.message || 'Failed to fetch blogs');
      }
    } catch {
      toast.error('An error occurred while fetching blogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00D1B2',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/blogs/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Blog deleted successfully');
          fetchBlogs();
        } else {
          const data = await res.json();
          toast.error(data.message || 'Failed to delete blog');
        }
      } catch {
        toast.error('An error occurred while deleting the blog');
      }
    }
  };

  const filteredBlogs = blogs.filter(blog => 
    (blog.title?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-8 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 w-full mb-[1px] md:mb-0">
        <div className="hidden md:block">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" />
            {t("blogs.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("blogs.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Link href="/admin/blogs/new" className="w-full md:w-auto">
            <Button className="font-bold w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" /> {t("blogs.create_blog")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("blogs.search_blogs") as string}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="hidden md:block rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">{t("blogs.thumbnail")}</TableHead>
              <TableHead className="font-bold">{t("blogs.blog_title")}</TableHead>
              <TableHead className="font-bold">{t("blogs.views")}</TableHead>
              <TableHead className="font-bold">{t("blogs.status")}</TableHead>
              <TableHead className="font-bold">{t("blogs.date")}</TableHead>
              <TableHead className="text-right font-bold">{t("blogs.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-10 w-16 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24 rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : filteredBlogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-left h-24 text-center text-muted-foreground">
                  {t("blogs.no_blogs")}
                </TableCell>
              </TableRow>
            ) : (
              filteredBlogs.map((blog) => (
                <TableRow key={blog._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="h-10 w-16 bg-muted rounded overflow-hidden relative">
                      {blog.thumbnail ? (
                        <Image
                          src={imageErrors[blog._id] ? 'https://placehold.co/400x225?text=Invalid+Image+URL' : blog.thumbnail}
                          alt={blog.title}
                          fill
                          className="object-cover"
                          onError={() =>
                            setImageErrors((prev) => ({ ...prev, [blog._id]: true }))
                          }
                          unoptimized
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground">{t("blogs.no_img")}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/blog/${blog.slug}`} 
                      target="_blank" 
                      className="font-bold text-sm max-w-[300px] truncate hover:text-primary transition-colors hover:underline decoration-primary/30 underline-offset-4 block"
                    >
                      {blog.title}
                    </Link>
                    <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[300px]">/{blog.slug}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-primary">{blog.views ?? 0}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={blog.isPublished ? 'default' : 'secondary'}>
                      {blog.isPublished ? t("blogs.published") : t("blogs.draft")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(blog.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/blog/${blog.slug}`} target="_blank">
                        <Button variant="ghost" size="icon-sm" title="View Publicly">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/blogs/edit/${blog._id}`}>
                        <Button variant="outline" size="icon-sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="destructive" 
                        size="icon-sm" 
                        onClick={() => handleDelete(blog._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border border-border/50 rounded-xl bg-card shadow-sm space-y-2">
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-background rounded-xl border">
            <p className="font-semibold text-sm">{t("blogs.no_blogs")}</p>
          </div>
        ) : (
          filteredBlogs.map((blog) => (
            <div key={blog._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
              {/* Blog Thumbnail Banner */}
              <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border bg-muted relative">
                {blog.thumbnail ? (
                  <Image
                    src={imageErrors[blog._id] ? 'https://placehold.co/400x225?text=Invalid+Image+URL' : blog.thumbnail}
                    alt={blog.title}
                    fill
                    className="object-cover"
                    onError={() =>
                      setImageErrors((prev) => ({ ...prev, [blog._id]: true }))
                    }
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">{t("blogs.no_img")}</div>
                )}
              </div>

              {/* Title & Slug */}
              <div className="flex items-start justify-between gap-3 border-t border-border/30 pt-2.5 mt-1">
                <div>
                  <Link 
                    href={`/blog/${blog.slug}`} 
                    target="_blank" 
                    className="font-bold text-base text-foreground leading-snug hover:underline block"
                  >
                    {blog.title}
                  </Link>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">/{blog.slug}</div>
                </div>

                <Badge variant={blog.isPublished ? 'default' : 'secondary'} className="shrink-0 text-xs px-2 py-0.5">
                  {blog.isPublished ? t("blogs.published") : t("blogs.draft")}
                </Badge>
              </div>

              {/* Views and Date row */}
              <div className="flex items-center justify-between text-xs border-t border-border/30 pt-2 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span>Views:</span>
                  <span className="font-extrabold text-foreground">{blog.views ?? 0}</span>
                </div>
                <div>
                  <span>Date:</span>
                  <span className="font-semibold text-foreground ml-1">{new Date(blog.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t pt-2.5 mt-1">
                <Link href={`/blog/${blog.slug}`} target="_blank">
                  <Button variant="outline" size="sm" className="h-9 px-3 text-xs flex gap-1 font-bold items-center">
                    <ExternalLink className="h-3.5 w-3.5" /> View
                  </Button>
                </Link>
                <Link href={`/admin/blogs/edit/${blog._id}`}>
                  <Button variant="outline" size="sm" className="h-9 px-3 text-xs flex gap-1 font-bold items-center">
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-3 text-destructive border-destructive/20 hover:bg-destructive/10 text-xs flex gap-1 font-bold items-center"
                  onClick={() => handleDelete(blog._id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {!loading && pagination.totalPages > 1 && (
        <div className="py-4">
          <Pagination 
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              fetchBlogs(page);
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', page.toString());
              router.push(`?${params.toString()}`);
            }}
          />
        </div>
      )}
    </div>
  );
}
export default function BlogsPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton rowCount={6} columnCount={6} titleWidth="w-48" />}>
      <BlogsContent />
    </Suspense>
  );
}

