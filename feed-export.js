export async function exportMeta(products) {
  const xml = `
<rss version="2.0">
<channel>
${products.map(p => `
<item>
<title>${p["g:title"]}</title>
<price>${p["g:price"]}</price>
</item>
`).join("")}
</channel>
</rss>`;

  const blob = new Blob([xml], { type: "application/xml" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "meta-feed.xml";
  a.click();
}
