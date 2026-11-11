import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import connectToDatabase from '@/lib/db';
import Blog from '@/models/Blog';
import { auth } from '@/auth';
import mongoose from 'mongoose';
import { deleteFromR2 } from '@/lib/r2';
import { purgeCloudflareCache } from '@/lib/cloudflareCache';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin', 'manager'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Blog not found' }, { status: 404 });
    }

    await connectToDatabase();
    const blog = await Blog.findOne({ _id: id });

    if (!blog) {
      return NextResponse.json({ message: 'Blog not found' }, { status: 404 });
    }

    return NextResponse.json(blog);
  } catch (error: any) {
    console.error('[Admin Blog GET] error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin', 'manager'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Blog not found' }, { status: 404 });
    }

    const body = await req.json();
    await connectToDatabase();

    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return NextResponse.json({ message: 'Blog not found' }, { status: 404 });
    }

    // Check slug uniqueness if it's changing
    if (body.slug) {
      const duplicateSlugBlog = await Blog.findOne({ slug: body.slug, _id: { $ne: id } });
      if (duplicateSlugBlog) {
        return NextResponse.json({ message: 'A blog with this slug already exists' }, { status: 400 });
      }
    }

    // Whitelist allowed fields to prevent mass-assignment
    const updates = {
      title: body.title,
      slug: body.slug,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      content: body.content,
      thumbnail: body.thumbnail,
      isPublished: body.isPublished
    };

    // Remove undefined fields to avoid overwriting with null/undefined if not provided
    Object.keys(updates).forEach(key => (updates as any)[key] === undefined && delete (updates as any)[key]);

    const blog = await Blog.findOneAndUpdate(
      { _id: id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!blog) {
      return NextResponse.json({ message: 'Blog not found' }, { status: 404 });
    }

    // Clean up old thumbnail from R2 if thumbnail was updated
    if (existingBlog.thumbnail && updates.thumbnail && existingBlog.thumbnail !== updates.thumbnail) {
      deleteFromR2(existingBlog.thumbnail).catch((err) =>
        console.error('Failed to delete old blog thumbnail from R2:', err)
      );
    }

    // Revalidate paths to show the changes instantly
    try {
      revalidatePath('/');
      revalidatePath('/blog');
      revalidatePath(`/blog/${blog.slug}`);
      revalidateTag('blogs', 'max');
      purgeCloudflareCache().catch((err) =>
        console.error('Failed to purge Cloudflare cache on blog update:', err)
      );
    } catch (revalidateError) {
      console.error('[Admin Blog Update revalidatePath] error:', revalidateError);
    }

    return NextResponse.json(blog);
  } catch (error: any) {
    console.error('[Admin Blog PUT] error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin', 'manager'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Blog not found' }, { status: 404 });
    }

    await connectToDatabase();

    const blog = await Blog.findOneAndDelete({ _id: id });

    if (!blog) {
      return NextResponse.json({ message: 'Blog not found' }, { status: 404 });
    }

    if (blog.thumbnail) {
      deleteFromR2(blog.thumbnail).catch((err) =>
        console.error('Failed to delete blog thumbnail from R2:', err)
      );
    }

    purgeCloudflareCache().catch((err) =>
      console.error('Failed to purge Cloudflare cache on blog delete:', err)
    );

    // Revalidate paths after deletion
    try {
      revalidatePath('/');
      revalidatePath('/blog');
      revalidatePath(`/blogs/${blog.slug}`);
      revalidateTag('blogs', 'max');
    } catch (revalidateError) {
      console.error('[Admin Blog Delete revalidatePath] error:', revalidateError);
    }

    return NextResponse.json({ message: 'Blog deleted successfully' });
  } catch (error: any) {
    console.error('[Admin Blog DELETE] error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
