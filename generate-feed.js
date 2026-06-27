// generate-feed.js — D'Zoe Perú
// Genera feed.xml compatible con Google Merchant Center (namespace g:)
// Ejecutar: node generate-feed.js
// Requiere: @supabase/supabase-js  (npm install @supabase/supabase-js)

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Configuración Supabase ──────────────────────────────────────────────────
// Las credenciales se leen desde variables de entorno (GitHub Secrets en CI,
// o un archivo .env local para correr manualmente).
const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://uxwmodnadidlsfwtshcq.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON || '';

if (!SUPABASE_ANON) {
  console.error('❌ Falta la variable de entorno SUPABASE_ANON.');
  console.error('   Crea un archivo .env o agrégala como GitHub Secret.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSlug(product) {
  return (product.slug || String(product.id))
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Devuelve el precio mínimo con stock de un producto.
 * Si no hay ninguna talla con stock, devuelve el precio mínimo global.
 */
function getPrice(product) {
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];

  // precio con stock
  const withStock = sizes.filter(s => s.stock > 0 && s.price);
  if (withStock.length) {
    return Math.min(...withStock.map(s => parseFloat(s.price)));
  }

  // precio sin stock (fallback)
  const allPrices = sizes.filter(s => s.price).map(s => parseFloat(s.price));
  if (allPrices.length) return Math.min(...allPrices);

  // precio directo en el producto
  return parseFloat(product.price || product.precio || 0);
}

function hasStock(product) {
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  if (sizes.length) return sizes.some(s => s.stock > 0);
  // si no hay tallas, usar campo stock directo
  const s = parseInt(product.stock ?? product.cantidad ?? 1);
  return s > 0;
}

function getImage(product) {
  if (Array.isArray(product.images) && product.images[0]) return product.images[0];
  if (product.image)  return product.image;
  if (product.imagen) return product.imagen;
  return '';
}

function getCategories(product) {
  if (Array.isArray(product.categories)) return product.categories.join(' > ');
  if (product.category)   return product.category;
  if (product.categoria)  return product.categoria;
  return 'Ropa Infantil';
}

// Google Product Category — apparel genérico para bebés/niños
// Ver: https://www.google.com/basepages/producttype/taxonomy-with-ids.es-419.txt
const GOOGLE_CATEGORY = '267'; // Ropa y accesorios > Ropa > Ropa para bebés y niños pequeños

// ── Generador XML ────────────────────────────────────────────────────────────

function buildFeedXml(products) {
  const now = new Date().toUTCString();

  const items = products.map(p => {
    const slug        = buildSlug(p);
    const price       = getPrice(p);
    const inStock     = hasStock(p);
    const image       = getImage(p);
    const categories  = getCategories(p);
    const productUrl  = `https://dzoeperu.com/producto.html?slug=${slug}`;
    const desc        = p.description || p.descripcion ||
                        `${p.name} — ropa infantil importada premium. D'Zoe Perú.`;

    // availability: valor exacto que exige Google
    const availability = inStock ? 'in stock' : 'out of stock';

    // precio formateado: "XX.XX PEN"
    const priceStr = price > 0 ? `${price.toFixed(2)} PEN` : '0.00 PEN';

    return `
  <item>
    <g:id>${escapeXml(String(p.id))}</g:id>
    <title>${escapeXml(p.name)}</title>
    <description>${escapeXml(desc)}</description>
    <link>${escapeXml(productUrl)}</link>
    <g:image_link>${escapeXml(image)}</g:image_link>
    <g:availability>${availability}</g:availability>
    <g:price>${priceStr}</g:price>
    <g:brand>D&apos;Zoe Perú</g:brand>
    <g:condition>new</g:condition>
    <g:google_product_category>${GOOGLE_CATEGORY}</g:google_product_category>
    <g:product_type>${escapeXml(categories)}</g:product_type>
    <g:shipping>
      <g:country>PE</g:country>
      <g:service>Shalom / Olva Courier</g:service>
      <g:price>0.00 PEN</g:price>
    </g:shipping>
    <g:identifier_exists>false</g:identifier_exists>
  </item>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:g="http://base.google.com/ns/1.0"
  xmlns:atom="http://www.w3.org/2005/Atom">

  <channel>
    <title>D&apos;Zoe Perú — Ropa Infantil Importada Premium</title>
    <link>https://dzoeperu.com/</link>
    <description>Tienda N°1 de ropa infantil importada premium en Perú. Bebés y niños de 0 a 14 años.</description>
    <language>es-PE</language>
    <pubDate>${now}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://dzoeperu.com/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 Cargando productos desde Supabase…');

  const { data, error } = await supabase
    .from('products')           // ← ajusta si tu tabla tiene otro nombre
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error Supabase:', error.message);
    process.exit(1);
  }

  console.log(`✅ ${data.length} productos cargados.`);

  const xml = buildFeedXml(data);

  const outPath = path.join(__dirname, 'feed.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`📄 feed.xml generado → ${outPath}`);
}

main();
