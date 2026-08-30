export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Suggests a variant SKU like TEE-BLK-M-001 from the product SKU prefix + color + size. */
export function suggestVariantSku(productSku: string, color: string, size: string, sequence: number): string {
  const prefix = productSku.split("-")[0]?.toUpperCase() || "PROD";
  const colorCode = color.slice(0, 3).toUpperCase();
  const sizeCode = size.toUpperCase();
  return `${prefix}-${colorCode}-${sizeCode}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Generates a plausible-looking 12-digit numeric barcode for a new variant
 * (not a real checksummed UPC/EAN, just enough to give every variant a
 * scannable-looking value for the POS search/lookup field).
 */
export function generateBarcode(sequence: number): string {
  const timePart = Date.now().toString().slice(-8);
  return `${timePart}${String(sequence).padStart(4, "0")}`;
}
