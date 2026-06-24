export function validateProduct(product) {
  const errors = [];

  const price = parseFloat(product["g:price"] || 0);

  if (price <= 0) errors.push("PRECIO_INVALIDO");
  if (!product["g:image_link"]) errors.push("SIN_IMAGEN");
  if (!product["g:title"]) errors.push("SIN_TITULO");
  if (!product["g:availability"]) errors.push("SIN_STOCK");

  return {
    valid: errors.length === 0,
    errors
  };
}
