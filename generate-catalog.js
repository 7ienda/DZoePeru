/**
 * generate-catalog.js  —  D'Zoe Perú
 * Genera catalog.xml compatible con Meta Commerce Manager
 */

const { createClient } = require('@supabase/supabase-js');
const fs               = require('fs');
const ws               = require('ws');

// ── Credenciales ──────────────────────────────────────────────────────────────
const SUPABASE_URL      = (process.env.SUPABASE_URL      || '').trim()
                          || 'https://uxwmodnadidlsfwtshcq.supabase.co';
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim()
                          || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4d21vZG5hZGlkbHNmd3RzaGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzY0MjAsImV4cCI6MjA5NTY1MjQyMH0.V3tNuv2iT9J2WbZbs7bzxf9j9RwF2r-Li4KO_1qQWRo';

const STORE_URL   = 'https://dzoeperu.com';
const BRAND       = "D'Zoe Perú";
const OUTPUT_FILE = 'catalog.xml';
const GOOGLE_CAT  = '5323';

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toSlug(product) {
  return (product.name || String(product.id))
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getMinPrice(sizes = []) {
  const withStock = sizes.filter(s => s.stock > 0 && Number(s.price) > 0);
  const pool      = withStock.length ? withStock : sizes.filter(s => Number(s.price) > 0);
  return pool.length ? Math.min(...pool.map(s => Number(s.price))) : 0;
}

function availableSizes(sizes = []) {
  return sizes.filter(s => s.stock > 0).map(s => s.size).join(', ');
}

function stripHtml(str) {
  return (str || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// ── Construcción del XML ──────────────────────────────────────────────────────
function buildFeed(products) {
  const now = new Date().toUTCString();

  const items = products.map(p => {
    const sizes    = Array.isArray(p.sizes) ? p.sizes : [];
    const hasStock = sizes.some(s => s.stock > 0);
    const price    = getMinPrice(sizes);
    const imgs     = Array.isArray(p.images) && p.images.length ? p.images
                     : (p.image ? [p.image] : []);
    const mainImg  = imgs[0] || '';
    const extraImgs = imgs.slice(1, 11);
    const url      = `${STORE_URL}/producto.html?slug=${toSlug(p)}`;
    const cats     = (p.categories || []).join(' > ') || 'Ropa Infantil';
    const desc     = stripHtml(p.description)
                     || `${p.name} — ropa infantil importada premium. D'Zoe Perú.`;

    const extraLines = extraImgs
      .map(img => `    <g:additional_image_link>${esc(img)}</g:additional_image_link>`)
      .join('\n');

    return `
  <item>
    <g:id>${esc(String(p.id))}</g:id>
    <g:title>${esc(p.name)}</g:title>
    <g:description>${esc(desc)}</g:description>
    <g:link>${esc(url)}</g:link>
    <g:image_link>${esc(mainImg)}</g:image_link>
${extraLines ? extraLines + '\n' : ''}    <g:availability>${hasStock ? 'in stock' : 'out of stock'}</g:availability>
    <g:price>${price > 0 ? price.toFixed(2) + ' PEN' : '0.00 PEN'}</g:price>
    <g:brand>${esc(BRAND)}</g:brand>
    <g:condition>new</g:condition>
    <g:google_product_category>${GOOGLE_CAT}</g:google_product_category>
    <g:product_type>${esc(cats)}</g:product_type>
    <g:custom_label_0>${esc((p.categories || []).join(', '))}</g:custom_label_0>
    <g:custom_label_1>${esc(availableSizes(sizes))}</g:custom_label_1>${p.is_new   ? '\n    <g:custom_label_2>Nuevo</g:custom_label_2>'      : ''}${p.on_sale  ? '\n    <g:custom_label_3>Oferta</g:custom_label_3>'     : ''}${p.featured ? '\n    <g:custom_label_4>Destacado</g:custom_label_4>' : ''}
  </item>`;
  });

  // Nota: el repo usa .nojekyll, así que GitHub Pages sirve los archivos
  // tal cual (sin pasar por Jekyll). NO se debe agregar front matter aquí.
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { transport: ws }
  });

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error Supabase:', error.message);
    process.exit(1);
  }

  console.log(`✅ ${data.length} productos cargados`);

  const xml = buildFeed(data);
  fs.writeFileSync(OUTPUT_FILE, xml, 'utf8');
  console.log(`📄 ${OUTPUT_FILE} generado — ${data.length} ítems, ${xml.length} bytes`);
}

main().catch(err => { console.error('❌ Error fatal:', err); process.exit(1); });
