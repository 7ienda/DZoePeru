#!/usr/bin/env node
/**
 * D'Zoe Perú — Generador de páginas estáticas de producto
 * ─────────────────────────────────────────────────────────
 * Lee productos desde Supabase y genera:
 *   - /productos/{slug}.html   (1 archivo por producto, con SEO completo)
 *   - /sitemap.xml             (actualizado con todas las URLs de producto)
 *   - /products.json           (catálogo plano, útil para otras páginas/búsqueda)
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/generate-products.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// ═══════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════
const SITE_URL   = 'https://dzoeperu.com';
const WA_PHONE   = '51956063145';
const OUT_DIR    = path.join(process.cwd(), 'productos');
const SITEMAP    = path.join(process.cwd(), 'sitemap.xml');
const PRODUCTS_JSON = path.join(process.cwd(), 'products.json');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim()
                      || 'https://uxwmodnadidlsfwtshcq.supabase.co';
const SUPABASE_KEY  = (process.env.SUPABASE_ANON_KEY || '').trim()
                      || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4d21vZG5hZGlkbHNmd3RzaGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzY0MjAsImV4cCI6MjA5NTY1MjQyMH0.V3tNuv2iT9J2WbZbs7bzxf9j9RwF2r-Li4KO_1qQWRo';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan credenciales de Supabase');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws }
});

// ═══════════════════════════════════════════════════════
//  HELPERS (mismas reglas que usa index.html en el navegador)
// ═══════════════════════════════════════════════════════
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function buildSlug(product) {
  // IMPORTANTE: debe coincidir exactamente con buildProductSlug() de index.html
  // y toSlug() de generate-catalog.js — son el mismo sitio, mismo slug en todas partes.
  return (product.name || String(product.id))
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildSeoTitle(product) {
  const name = product.name || '';
  const cat = product.categories?.[0] || '';
  const size = (product.sizes || []).find(s => s.stock > 0)?.size || '';
  let title = name;
  if (cat && !name.toLowerCase().includes(cat.toLowerCase())) title = `${cat} ${name}`;
  const ageCtx = size ? ` Talla ${size}` : '';
  return `${title}${ageCtx} | D'Zoe Perú`;
}

function getMinPrice(product) {
  const sizes = product.sizes || [];
  const prices = sizes.filter(s => s.price > 0).map(s => Number(s.price));
  return prices.length ? Math.min(...prices) : 0;
}

function getOfferInfo(product) {
  const minP = getMinPrice(product);
  const offerPrice = product.offer_price ? parseFloat(product.offer_price) : null;
  const hasOffer = offerPrice && offerPrice > 0 && offerPrice < minP;
  return { minP, hasOffer, offerPrice, displayPrice: hasOffer ? offerPrice : minP };
}

function hasStock(product) {
  return (product.sizes || []).some(s => s.stock > 0);
}

function getImages(product) {
  if (product.images && product.images.length) return product.images;
  if (product.image) return [product.image];
  return ['https://placehold.co/800x800?text=D%27Zoe+Peru'];
}

// ═══════════════════════════════════════════════════════
//  PLANTILLA HTML POR PRODUCTO
// ═══════════════════════════════════════════════════════
function renderProductPage(product, allProducts) {
  const slug = buildSlug(product);
  const seoTitle = buildSeoTitle(product);
  const desc = (product.description || `${product.name} — ropa infantil importada premium de alta gama. Envíos a todo el Perú.`).slice(0, 300);
  const cat = product.categories?.[0] || 'Ropa Infantil';
  const imgs = getImages(product);
  const mainImg = imgs[0];
  const { minP, hasOffer, offerPrice, displayPrice } = getOfferInfo(product);
  const inStock = hasStock(product);
  const url = `${SITE_URL}/productos/${slug}.html`;
  const waMsg = encodeURIComponent(`Hola D'Zoe Perú 🌸 me interesa el producto: *${product.name}*. ¿Tienen disponibilidad? ${url}`);
  const waUrl = `https://wa.me/${WA_PHONE}?text=${waMsg}`;

  // ── Relacionados: misma categoría, excluyendo el actual, máx 4 ──
  const related = allProducts
    .filter(p => p.id !== product.id && (p.categories || []).some(c => (product.categories || []).includes(c)))
    .slice(0, 4);
  const relatedFallback = related.length ? related : allProducts.filter(p => p.id !== product.id).slice(0, 4);

  const sizesHtml = (product.sizes || []).map(sz => `
    <span class="dz-size ${sz.stock > 0 ? '' : 'out'}">${esc(sz.size)} ${sz.stock > 0 ? `<small>📦 ${sz.stock}</small>` : '<small>❌</small>'}</span>
  `).join('');

  const thumbsHtml = imgs.length > 1 ? `
    <div class="dz-thumbs">
      ${imgs.map((img, i) => `<img src="${esc(img)}" alt="${esc(product.name)} foto ${i + 1}" class="dz-thumb${i === 0 ? ' active' : ''}" onclick="document.getElementById('dzMainImg').src=this.src;document.querySelectorAll('.dz-thumb').forEach(t=>t.classList.remove('active'));this.classList.add('active');">`).join('')}
    </div>` : '';

  const relatedHtml = relatedFallback.map(p => {
    const pImgs = getImages(p);
    const pSlug = buildSlug(p);
    const pPrice = getOfferInfo(p).displayPrice;
    return `
    <a class="dz-rel-card" href="/productos/${pSlug}.html">
      <img src="${esc(pImgs[0])}" alt="${esc(p.name)}" loading="lazy">
      <div class="dz-rel-name">${esc(p.name)}</div>
      <div class="dz-rel-price">${pPrice > 0 ? `S/ ${pPrice.toFixed(2)}` : 'Consultar'}</div>
    </a>`;
  }).join('');

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": seoTitle,
    "description": desc,
    "image": imgs,
    "sku": String(product.id),
    "mpn": `DZOE-${product.id}`,
    "brand": { "@type": "Brand", "name": "D'Zoe Perú" },
    "category": product.categories?.join(' > ') || 'Ropa Infantil',
    "url": url,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "PEN",
      "price": displayPrice > 0 ? displayPrice.toFixed(2) : "0.00",
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition",
      "seller": { "@type": "Organization", "name": "D'Zoe Perú", "url": SITE_URL, "telephone": `+${WA_PHONE}` },
      "url": url,
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 7,
        "returnMethod": "https://schema.org/ReturnByMail"
      }
    },
    "additionalProperty": (product.sizes || []).map(sz => ({
      "@type": "PropertyValue", "name": "Talla", "value": sz.size, "unitCode": "H87"
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": `${SITE_URL}/` },
      { "@type": "ListItem", "position": 2, "name": cat, "item": `${SITE_URL}/?categoria=${encodeURIComponent(cat.toLowerCase())}` },
      { "@type": "ListItem", "position": 3, "name": product.name, "item": url }
    ]
  };

  return `<!DOCTYPE html>
<html lang="es-PE" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

<title>${esc(seoTitle)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
<meta name="author" content="D'Zoe Perú">
<link rel="canonical" href="${url}">

<link rel="preload" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap"></noscript>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<link rel="icon" type="image/png" sizes="32x32" href="${SITE_URL}/favicon-32x32.png">

<!-- ═══ OPEN GRAPH ═══ -->
<meta property="og:type" content="product">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(seoTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(mainImg)}">
<meta property="og:image:alt" content="${esc(product.name)} — D'Zoe Perú">
<meta property="og:locale" content="es_PE">
<meta property="og:site_name" content="D'Zoe Perú">
<meta property="product:price:amount" content="${displayPrice.toFixed(2)}">
<meta property="product:price:currency" content="PEN">

<!-- ═══ TWITTER ═══ -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(seoTitle)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(mainImg)}">

<!-- ═══ JSON-LD ═══ -->
<script type="application/ld+json">${JSON.stringify(productSchema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>

<style>
:root{--rose:#e8a4c0;--rose-dark:#d4809f;--rose-light:#f9dde9;--rose-soft:#fef0f5;--lavender:#c3aee4;--lav-light:#ede4f9;--cream:#fee4f5;--text:#4a4460;--text-soft:#8a85a0;--white:#fff;--border:#ede8f5;--shadow-sm:0 2px 12px rgba(195,174,228,.12);--shadow-md:0 8px 28px rgba(195,174,228,.2);}
*{box-sizing:border-box;}
body{margin:0;font-family:'Nunito',sans-serif;background:var(--cream);color:var(--text);}
a{color:inherit;}
.dz-header{display:flex;align-items:center;justify-content:space-between;padding:14px 5%;background:var(--white);box-shadow:var(--shadow-sm);position:sticky;top:0;z-index:10;}
.dz-logo{font-family:'Baloo 2',cursive;color:var(--rose);font-size:24px;font-weight:800;text-decoration:none;}
.dz-back{font-size:13px;font-weight:700;color:var(--text-soft);text-decoration:none;display:flex;align-items:center;gap:6px;}
.dz-back:hover{color:var(--rose);}
.dz-wrap{max-width:1100px;margin:0 auto;padding:22px 5% 60px;}
.dz-breadcrumb{font-size:12.5px;color:var(--text-soft);margin-bottom:18px;display:flex;flex-wrap:wrap;gap:6px;}
.dz-breadcrumb a{text-decoration:none;color:var(--text-soft);font-weight:600;}
.dz-breadcrumb a:hover{color:var(--rose);}
.dz-product{display:grid;grid-template-columns:1fr 1fr;gap:40px;background:var(--white);border-radius:22px;padding:28px;box-shadow:var(--shadow-md);}
.dz-main-img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:16px;background:var(--rose-soft);}
.dz-thumbs{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
.dz-thumb{width:64px;height:64px;object-fit:cover;border-radius:10px;cursor:pointer;border:2px solid transparent;opacity:.7;}
.dz-thumb.active,.dz-thumb:hover{opacity:1;border-color:var(--rose);}
.dz-cat-badge{display:inline-block;background:var(--lav-light);color:#6c5a96;font-size:11.5px;font-weight:800;padding:5px 12px;border-radius:99px;margin-bottom:10px;}
h1.dz-title{font-family:'Baloo 2',cursive;font-size:26px;margin:0 0 10px;color:var(--text);line-height:1.25;}
.dz-desc{font-size:14.5px;line-height:1.6;color:var(--text-soft);margin-bottom:18px;}
.dz-price-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px;}
.dz-price{font-size:28px;font-weight:800;color:var(--rose-dark);font-family:'Baloo 2',cursive;}
.dz-price-old{text-decoration:line-through;color:var(--text-soft);font-size:15px;opacity:.7;}
.dz-discount{background:#dc2626;color:#fff;font-size:10px;font-weight:800;padding:3px 9px;border-radius:99px;}
.dz-stock{font-size:12.5px;font-weight:800;padding:5px 12px;border-radius:99px;display:inline-block;margin-bottom:16px;}
.dz-stock.in{background:#e8f5ed;color:#1a7a3a;}
.dz-stock.out{background:#fde8e8;color:#c0392b;}
.dz-sizes{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;}
.dz-size{border:1.5px solid var(--border);border-radius:10px;padding:7px 12px;font-size:12.5px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:2px;}
.dz-size.out{opacity:.45;}
.dz-size small{font-weight:600;color:var(--text-soft);font-size:10px;}
.dz-cta{display:flex;flex-direction:column;gap:10px;}
.dz-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:14px;font-weight:800;font-size:14.5px;text-decoration:none;border:none;cursor:pointer;font-family:'Nunito',sans-serif;transition:.2s;}
.dz-btn-primary{background:linear-gradient(135deg,var(--rose),var(--rose-dark));color:#fff;}
.dz-btn-primary:hover{box-shadow:var(--shadow-md);transform:translateY(-1px);}
.dz-btn-wa{background:#e8f5ed;color:#1a7a3a;border:1.5px solid #b5e4c6;}
.dz-btn-wa:hover{background:#25D366;color:#fff;border-color:#25D366;}
.dz-trust{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;}
.dz-trust span{font-size:11px;font-weight:700;color:var(--text-soft);background:var(--rose-soft);padding:5px 10px;border-radius:99px;}
.dz-related{margin-top:48px;}
.dz-related h2{font-family:'Baloo 2',cursive;font-size:20px;color:var(--text);margin-bottom:16px;}
.dz-rel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;}
.dz-rel-card{background:var(--white);border-radius:14px;padding:10px;box-shadow:var(--shadow-sm);text-decoration:none;color:var(--text);transition:.2s;}
.dz-rel-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-md);}
.dz-rel-card img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:10px;margin-bottom:8px;}
.dz-rel-name{font-size:12.5px;font-weight:700;line-height:1.3;margin-bottom:4px;}
.dz-rel-price{font-size:13px;font-weight:800;color:var(--rose-dark);}
.dz-footer{text-align:center;padding:24px;font-size:12px;color:var(--text-soft);}
@media(max-width:760px){.dz-product{grid-template-columns:1fr;padding:18px;gap:20px;}}
</style>
</head>
<body>

<header class="dz-header">
  <a href="/" class="dz-logo">D'Zoe Perú 🌸</a>
  <a href="/" class="dz-back"><i class="fas fa-store"></i> Ver toda la tienda</a>
</header>

<div class="dz-wrap">
  <nav class="dz-breadcrumb" aria-label="Ruta">
    <a href="/">Inicio</a> /
    <a href="/?categoria=${encodeURIComponent(cat.toLowerCase())}">${esc(cat)}</a> /
    <span>${esc(product.name)}</span>
  </nav>

  <article class="dz-product">
    <div>
      <img id="dzMainImg" class="dz-main-img" src="${esc(mainImg)}" alt="${esc(product.name)}">
      ${thumbsHtml}
    </div>
    <div>
      <span class="dz-cat-badge">${esc(cat)}</span>
      <h1 class="dz-title">${esc(seoTitle.replace(" | D'Zoe Perú", ''))}</h1>
      <p class="dz-desc">${esc(desc)}</p>

      <div class="dz-price-row">
        ${hasOffer
          ? `<span class="dz-price">S/ ${displayPrice.toFixed(2)}</span><span class="dz-price-old">S/ ${minP.toFixed(2)}</span><span class="dz-discount">-${Math.round((1 - offerPrice / minP) * 100)}%</span>`
          : `<span class="dz-price">${displayPrice > 0 ? `S/ ${displayPrice.toFixed(2)}` : 'Consultar'}</span>`}
      </div>
      <span class="dz-stock ${inStock ? 'in' : 'out'}">${inStock ? '✅ En stock' : '❌ Agotado'}</span>

      ${(product.sizes || []).length ? `<div class="dz-sizes">${sizesHtml}</div>` : ''}

      <div class="dz-cta">
        <a class="dz-btn dz-btn-primary" href="/producto.html?slug=${slug}"><i class="fas fa-shopping-bag"></i> Comprar en la tienda</a>
        <a class="dz-btn dz-btn-wa" href="${waUrl}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> Consultar por WhatsApp</a>
      </div>

      <div class="dz-trust">
        <span><i class="fas fa-check-circle"></i> Pago seguro</span>
        <span><i class="fas fa-truck"></i> Envíos a todo el Perú</span>
        <span><i class="fas fa-crown"></i> Importado premium</span>
        <span><i class="fas fa-shield-alt"></i> Garantía de satisfacción</span>
      </div>
    </div>
  </article>

  ${relatedFallback.length ? `
  <section class="dz-related">
    <h2>También te puede gustar</h2>
    <div class="dz-rel-grid">${relatedHtml}</div>
  </section>` : ''}
</div>

<footer class="dz-footer">
  © ${new Date().getFullYear()} D'Zoe Perú — Av. Isabel la Católica N°1610, La Victoria, Lima · <a href="https://wa.me/${WA_PHONE}">+${WA_PHONE.slice(0,2)} ${WA_PHONE.slice(2)}</a>
</footer>

</body>
</html>`;
}

// ═══════════════════════════════════════════════════════
//  SITEMAP.XML
// ═══════════════════════════════════════════════════════
function updateSitemap(products) {
  const today = new Date().toISOString().split('T')[0];

  let existingUrls = [];
  if (fs.existsSync(SITEMAP)) {
    const xml = fs.readFileSync(SITEMAP, 'utf-8');
    const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
    // Conservar todas las URLs que NO son de /productos/ (home, categorías, blog, etc.)
    existingUrls = blocks.filter(b => !b.includes('/productos/'));
  } else {
    existingUrls = [`  <url>\n    <loc>${SITE_URL}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`];
  }

  const productUrls = products.map(p => {
    const slug = buildSlug(p);
    return `  <url>\n    <loc>${SITE_URL}/productos/${slug}.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
  });

  const xmlOut = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...existingUrls, ...productUrls].join('\n')}\n</urlset>\n`;

  fs.writeFileSync(SITEMAP, xmlOut, 'utf-8');
  console.log(`✅ sitemap.xml actualizado (${productUrls.length} productos + ${existingUrls.length} otras URLs)`);
}

// ═══════════════════════════════════════════════════════
//  PRODUCTS.JSON
// ═══════════════════════════════════════════════════════
function writeProductsJson(products) {
  const flat = products.map(p => {
    const { displayPrice } = getOfferInfo(p);
    return {
      id: p.id,
      slug: buildSlug(p),
      name: p.name,
      price: displayPrice,
      image: getImages(p)[0],
      categories: p.categories || [],
      inStock: hasStock(p),
      url: `/productos/${buildSlug(p)}.html`
    };
  });
  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(flat, null, 2), 'utf-8');
  console.log(`✅ products.json actualizado (${flat.length} productos)`);
}

// ═══════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════
async function main() {
  console.log('🔄 Conectando a Supabase...');
  const { data: products, error } = await supabase.from('products').select('*');
  if (error) {
    console.error('❌ Error al leer productos:', error.message);
    process.exit(1);
  }
  console.log(`✅ ${products.length} productos cargados`);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Slugs vistos en esta corrida (para poder borrar archivos huérfanos)
  const currentSlugs = new Set();

  for (const product of products) {
    const slug = buildSlug(product);
    currentSlugs.add(`${slug}.html`);
    const html = renderProductPage(product, products);
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.html`), html, 'utf-8');
  }
  console.log(`✅ ${products.length} páginas HTML generadas en /productos`);

  // Borrar páginas de productos que ya no existen en Supabase (descontinuados)
  const existingFiles = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.html'));
  let removed = 0;
  for (const file of existingFiles) {
    if (!currentSlugs.has(file)) {
      fs.unlinkSync(path.join(OUT_DIR, file));
      removed++;
    }
  }
  if (removed) console.log(`🗑️  ${removed} páginas de productos descontinuados eliminadas`);

  updateSitemap(products);
  writeProductsJson(products);

  console.log('🎉 Generación completa.');
}

main().catch(err => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});
