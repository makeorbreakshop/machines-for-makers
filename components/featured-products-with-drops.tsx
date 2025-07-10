import { PriceDropService } from '@/lib/services/price-drop-service';
import ProductsGrid from '@/components/products-grid';
import type { Machine } from '@/lib/database-types';

interface FeaturedProductsWithDropsProps {
  products: Machine[];
}

export async function FeaturedProductsWithDrops({ products }: FeaturedProductsWithDropsProps) {
  // Get machine IDs
  const machineIds = products.map(p => p.id);
  
  // Fetch price drops for these machines
  const priceDrops = await PriceDropService.getRecentPriceDrops(machineIds, 7);

  return (
    <ProductsGrid
      products={products}
      totalProducts={products.length}
      priceDrops={priceDrops}
    />
  );
}