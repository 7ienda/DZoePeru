import { validateProduct } from "./feed-rules.js";

export async function loadCatalog() {
  const res = await fetch("/catalog.xml");
  const text = await res.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");

  const items = [...xml.querySelectorAll("item")];

  return items.map(item => ({
    "g:id": item.querySelector("g\\:id")?.textContent,
    "g:title": item.querySelector("g\\:title")?.textContent,
    "g:price": item.querySelector("g\\:price")?.textContent,
    "g:image_link": item.querySelector("g\\:image_link")?.textContent,
    "g:availability": item.querySelector("g\\:availability")?.textContent
  }));
}

export async function syncCatalogData() {
  const products = await loadCatalog();

  let valid = 0;
  let errors = 0;
  let zeroPrice = 0;

  const errorList = [];

  for (const product of products) {
    const result = validateProduct(product);

    if (parseFloat(product["g:price"]) <= 0) zeroPrice++;

    if (result.valid) {
      valid++;
    } else {
      errors++;
      errorList.push({
        title: product["g:title"],
        errors: result.errors
      });
    }
  }

  return {
    total: products.length,
    valid,
    errors,
    zeroPrice,
    errorList
  };
}
