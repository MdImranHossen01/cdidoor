/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'products-data.json');
const products = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const updatedProducts = products.map(product => {
  const basePrice = Number(product.price);
  if (isNaN(basePrice) || basePrice <= 0) {
    throw new Error(`Invalid price: "${product.price}" on product: ${product.name}`);
  }

  // Set wholesalePrice to 80% of price (rounded to nearest 100)
  // Ensure it is at least the smallest valid non-zero price (1)
  let wholesalePrice = Math.round((basePrice * 0.8) / 100) * 100;
  if (wholesalePrice <= 0) {
    wholesalePrice = 1;
  }
  
  // Set wholesaleSalePrice to 80% of salePrice if it exists (rounded to nearest 100)
  let wholesaleSalePrice = null;
  if (product.salePrice !== undefined && product.salePrice !== null && product.salePrice !== '') {
    const salePriceVal = Number(product.salePrice);
    if (isNaN(salePriceVal) || salePriceVal <= 0) {
      throw new Error(`Invalid salePrice: "${product.salePrice}" on product: ${product.name}`);
    }
    wholesaleSalePrice = Math.round((salePriceVal * 0.8) / 100) * 100;
    if (wholesaleSalePrice <= 0) {
      wholesaleSalePrice = 1;
    }
  }
  
  return {
    ...product,
    wholesalePrice,
    wholesaleSalePrice
  };
});

fs.writeFileSync(dataPath, JSON.stringify(updatedProducts, null, 2), 'utf8');
console.log('Successfully added wholesalePrice and wholesaleSalePrice to all products in products-data.json');
