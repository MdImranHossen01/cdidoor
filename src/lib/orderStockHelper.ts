import mongoose from 'mongoose';
import Product from '@/models/Product';

/**
 * Restores stock and batch inventory when an order is cancelled or deleted.
 * Also decreases totalSales if it was previously counted.
 */
export async function restockOrderItems(order: any, session?: mongoose.ClientSession) {
  if (!order || !order.items || !Array.isArray(order.items) || order.items.length === 0) {
    return;
  }

  for (const item of order.items) {
    const productId = item.product?._id || item.product;
    if (!productId) continue;

    const query = Product.findById(productId);
    if (session) query.session(session);
    const product = await query;
    if (!product) continue;

    const quantity = Number(item.quantity) || 1;
    const hasVariant = !!(item.color || item.size);

    if (hasVariant) {
      const variant = product.variants?.find((v: any) =>
        String(v.color || '').trim().toLowerCase() === String(item.color || '').trim().toLowerCase() &&
        String(v.size || '').trim().toLowerCase() === String(item.size || '').trim().toLowerCase()
      );

      if (variant) {
        variant.stock = (variant.stock || 0) + quantity;

        // Restore batches if recorded
        if (item.batchesUsed && Array.isArray(item.batchesUsed) && item.batchesUsed.length > 0) {
          for (const b of item.batchesUsed) {
            const targetBatch = variant.batches?.find((vb: any) => vb.batchNumber === b.batchNumber);
            if (targetBatch) {
              targetBatch.stock = (targetBatch.stock || 0) + (Number(b.quantity) || 0);
            }
          }
        } else if (variant.batches && variant.batches.length > 0) {
          variant.batches[0].stock = (variant.batches[0].stock || 0) + quantity;
        }
      } else {
        product.stock = (product.stock || 0) + quantity;
      }
    } else {
      product.stock = (product.stock || 0) + quantity;

      // Restore batches if recorded
      if (item.batchesUsed && Array.isArray(item.batchesUsed) && item.batchesUsed.length > 0) {
        for (const b of item.batchesUsed) {
          const targetBatch = product.batches?.find((pb: any) => pb.batchNumber === b.batchNumber);
          if (targetBatch) {
            targetBatch.stock = (targetBatch.stock || 0) + (Number(b.quantity) || 0);
          }
        }
      } else if (product.batches && product.batches.length > 0) {
        product.batches[0].stock = (product.batches[0].stock || 0) + quantity;
      }
    }

    if (order.isSalesCounted) {
      product.totalSales = Math.max(0, (product.totalSales || 0) - quantity);
    }

    if (session) {
      await product.save({ session });
    } else {
      await product.save();
    }
  }
}

/**
 * Deducts stock when a previously cancelled order is restored/un-cancelled back to active status.
 */
export async function deductOrderItems(order: any, session?: mongoose.ClientSession) {
  if (!order || !order.items || !Array.isArray(order.items) || order.items.length === 0) {
    return;
  }

  for (const item of order.items) {
    const productId = item.product?._id || item.product;
    if (!productId) continue;

    const query = Product.findById(productId);
    if (session) query.session(session);
    const product = await query;
    if (!product) continue;

    const quantity = Number(item.quantity) || 1;
    const hasVariant = !!(item.color || item.size);

    if (hasVariant) {
      const variant = product.variants?.find((v: any) =>
        String(v.color || '').trim().toLowerCase() === String(item.color || '').trim().toLowerCase() &&
        String(v.size || '').trim().toLowerCase() === String(item.size || '').trim().toLowerCase()
      );

      if (variant) {
        variant.stock = Math.max(0, (variant.stock || 0) - quantity);
      } else {
        product.stock = Math.max(0, (product.stock || 0) - quantity);
      }
    } else {
      product.stock = Math.max(0, (product.stock || 0) - quantity);
    }

    if (session) {
      await product.save({ session });
    } else {
      await product.save();
    }
  }
}
