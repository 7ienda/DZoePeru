// generate-feed.js
// Genera feed.xml leyendo productos desde Supabase
// Ejecutado por GitHub Actions automáticamente

const https = require("https");
const fs = require("fs");

// ── Config ────────────────────────────────────────────────────────────────────
const SITE_URL   = "https://dzoeperu.com";
const SITE_TITLE = "D'Zoe Perú — Ropa Infantil Importada Premium";
const SITE_DESC  = "Tienda N°1 de ropa infantil importada premium en Perú. Vestidos, abrigos, conjuntos y bodies para bebés y niños de 0 a 14 años. Envíos a todo el Perú por Shalom.";
const MAX_ITEMS  = 50;

const SUPABASE_URL = process.env.SUPABASE_URL;   // secret en GitHub
const SUPABASE_KEY = process.env.SUPABASE_KEY;   // secret en GitHub

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Faltan variables SUPABASE_URL y SUPABASE_KEY");
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toRFC822(dateStr) {
  const d = new Date(dateStr);
  // Ajustar a hora Perú (UTC-5)
  return d.toUTCString().replace("GMT", "-0500");
}

function productUrl(p) {
  return p.slug
    ? `${SITE_URL}/producto.html?slug=${p.slug}`
    : `${SITE_URL}/producto.html?id=${p.id}`;
}

// ── Fetch desde Supabase REST API ─────────────────────────────────────────────
function fetchProducts() {
  return new Promise((resolve, reject) => {
    // Join con categorías usando el select de Supabase
    const query = encodeURIComponent(
   "id,name,description,price,image,slug,created_at,brand,categories"
    );
    const url = `${SUPABASE_URL}/rest/v1/products?select=${query}&order=created_at.desc&limit=${MAX_ITEMS}`;

    const options = {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    };

    https.get(url, options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Error parseando respuesta de Supabase: " + data));
        }
      });
    }).on("error", reject);
  });
}

// ── Generar XML ───────────────────────────────────────────────────────────────
function buildFeed(products) {
  const now = toRFC822(new Date().toISOString());

  const items = products.map(p => {
    const url      = productUrl(p);
    const title    = escapeXml(p.name || "Producto D'Zoe Perú");
   const catName  = p.categories || "Ropa Infantil";
const imgUrl   = escapeXml(p.image || `${SITE_URL}/og-image.jpg`);
    const brand    = p.brand    ? `<strong>Marca:</strong> ${escapeXml(p.brand)}<br>` : "";
    const price    = p.price    ? `<strong>Precio:</strong> S/ ${Number(p.price).toFixed(2)}<br>` : "";
    const desc     = escapeXml(p.description || `Producto importado premium de la categoría ${catName}.`);

    return `
  <item>
    <title>${title}</title>
    <link>${url}</link>
    <guid isPermaLink="${p.slug ? "true" : "false"}">${url}</guid>
    <pubDate>${toRFC822(p.created_at)}</pubDate>
    <dc:creator>D'Zoe Perú</dc:creator>
    <category>${escapeXml(catName)}</category>
    <description><![CDATA[${brand}${price}<p>${desc}</p><a href="${url}">Ver producto →</a>]]></description>
    <media:content url="${imgUrl}" medium="image"/>
    <media:thumbnail url="${imgUrl}"/>
  </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/">

  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}/</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>es-pe</language>
    <copyright>Copyright ${new Date().getFullYear()} D'Zoe Perú</copyright>
    <managingEditor>ventas@dzoeperu.com (D'Zoe Perú)</managingEditor>
    <pubDate>${now}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
    <ttl>1440</ttl>
    <image>
      <url>${SITE_URL}/og-image.jpg</url>
      <title>${escapeXml(SITE_TITLE)}</title>
      <link>${SITE_URL}/</link>
    </image>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log("📡 Conectando a Supabase...");
  const products = await fetchProducts();

  if (!Array.isArray(products)) {
    console.error("❌ Respuesta inesperada:", products);
    process.exit(1);
  }

  console.log(`✅ ${products.length} productos obtenidos`);

  const xml = buildFeed(products);
  fs.writeFileSync("feed.xml", xml, "utf8");

  console.log("✅ feed.xml generado correctamente");
})();
