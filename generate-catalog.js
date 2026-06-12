/**
 * generate-catalog.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Genera catalog.xml compatible con Meta Commerce Manager (formato RSS 2.0 /
 * Facebook Product Feed) consultando la tabla `products` de Supabase.
 *
 * Campos del feed:
 *   g:id, g:title, g:description, g:link, g:image_link,
 *   g:additional_image_link, g:availability, g:price, g:brand,
 *   g:condition, g:google_product_category, g:product_type,
 *   g:custom_label_0 (categorías), g:custom_label_1 (tallas disponibles)
 *
 * Uso local (para pruebas):
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_ANON_KEY=eyJ... \
 *   node generate-catalog.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { createClient } = require('@supabase/supabase-js');
const fs               = require('fs');

// ── Credenciales ──────────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.SUPABASE_URL      || 'https://uxwmodnadidlsfwtshcq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4d21vZG5hZGlkbHNmd3RzaGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzY0MjAsImV4cCI6MjA5NTY1MjQyMH0.V3tNuv2iT9J2WbZbs7bzxF9j9RwF2r-Li4KO_1qQWRo';
const STORE_URL         = 'https://dzoeperu.com';
const BRAND             = "D'Zoe Perú";
const OUTPUT_FILE       = 'catalog.xml';

// ── Google Product Category para ropa infantil ────────────────────────────────
// https://www.google.com/basepages/producttype/taxonomy-with-ids.es-ES.txt
const GOOGLE_CATEGORY   = '5323'; // Apparel & Accessories > Clothing > Baby & Toddler Clothing

// ── Helper: escapar XML ───────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

// ── Helper: slug de producto ──────────────────────────────────────────────────
function slug(product) {
  return (product.name || String(product.id))
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Helper: precio mínimo con stock ───────────────────────────────────────────
function getMinPrice(sizes = []) {
  const available = sizes.filter(s => s.stock > 0 && s.price > 0);
  if (!available.length) {
    // Si todo está agotado devolvemos igual el precio más bajo (requerido por Meta)
    const all = sizes.filter(s => s.price > 0);
    return all.length ? Math.min(...all.map(s => s.price)) : 0;
  }
  return Math.min(...available.map(s => s.price));
}

// ── Helper: tallas disponibles (string) ───────────────────────────────────────
function availableSizes(sizes = []) {
  return sizes
    .filter(s => s.stock > 0)
    .map(s => s.size)
    .join(', ');
}

// ── Construcción del feed ─────────────────────────────────────────────────────
function buildFeed(products) {
  const now = new Date().toUTCString();

  const items = products.map(p => {
    const sizes      = p.sizes || [];
    const hasStock   = sizes.some(s => s.stock > 0);
    const price      = getMinPrice(sizes);
    const images     = p.images && p.images.length ? p.images : (p.image ? [p.image] : []);
    const mainImage  = images[0] || '';
    const extraImgs  = images.slice(1, 11); // Meta acepta hasta 10 imágenes adicionales
    const productUrl = `${STORE_URL}/producto.html?slug=${slug(p)}`;
    const cats       = (p.categories || []).join(' > ') || 'Ropa Infantil';
    const desc       = p.description
      ? p.description.replace(/<[^>]*>/g, '') // strip HTML tags
      : `${p.name} — ropa infantil importada premium de alta gama. D'Zoe Perú.`;

    // g:item_group_id agrupa variantes; usamos el ID del producto
    // Para Meta, cada variante de talla debería ser un ítem separado.
    // Aquí generamos UN ítem por producto (multi-size) con el precio desde.
    // Si quieres variantes individuales, descomenta el bloque "variants" más abajo.

    const extraImgTags = extraImgs
      .map(img => `      <g:additional_image_link>${esc(img)}</g:additional_image_link>`)
      .join('\n');

    return `
  <item>
    <g:id>${esc(String(p.id))}</g:id>
    <g:title>${esc(p.name)}</g:title>
    <g:description>${esc(desc)}</g:description>
    <g:link>${esc(productUrl)}</g:link>
    <g:image_link>${esc(mainImage)}</g:image_link>
${extraImgTags ? extraImgTags + '\n' : ''}    <g:availability>${hasStock ? 'in stock' : 'out of stock'}</g:availability>
    <g:price>${price > 0 ? price.toFixed(2) + ' PEN' : '0.00 PEN'}</g:price>
    <g:brand>${esc(BRAND)}</g:brand>
    <g:condition>new</g:condition>
    <g:google_product_category>${GOOGLE_CATEGORY}</g:google_product_category>
    <g:product_type>${esc(cats)}</g:product_type>
    <g:custom_label_0>${esc((p.categories || []).join(', '))}</g:custom_label_0>
    <g:custom_label_1>${esc(availableSizes(sizes))}</g:custom_label_1>
    ${p.is_new  ? '<g:custom_label_2>Nuevo</g:custom_label_2>' : ''}
    ${p.on_sale ? '<g:custom_label_3>Oferta</g:custom_label_3>' : ''}
    ${p.featured ? '<g:custom_label_4>Destacado</g:custom_label_4>' : ''}
  </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(BRAND)} — Catálogo de Productos</title>
    <link>${STORE_URL}</link>
    <description>Ropa infantil importada premium para bebés y niños de 0 a 14 años. Envíos a todo el Perú.</description>
    <lastBuildDate>${now}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>
`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 Conectando a Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error al leer productos:', error.message);
    process.exit(1);
  }

  console.log(`✅ ${data.length} productos obtenidos`);

  const xml = buildFeed(data);
  fs.writeFileSync(OUTPUT_FILE, xml, 'utf8');
  console.log(`📄 ${OUTPUT_FILE} generado (${xml.length} bytes, ${data.length} ítems)`);
}

main().catch(err => { console.error(err); process.exit(1); });
