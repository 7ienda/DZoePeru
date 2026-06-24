import { syncCatalogData } from "./feed-sync.js";
import { exportMeta } from "./feed-export.js";
import supabase from "./supabase-feed.js";

window.syncCatalog = async function () {
  const result = await syncCatalogData();

  // Guardar log general
  await supabase.from("feed_logs").insert({
    total_products: result.total,
    valid_products: result.valid,
    error_products: result.errors,
    zero_price_products: result.zeroPrice
  });

  // Actualizar dashboard
  document.getElementById("total-products").textContent = result.total;
  document.getElementById("valid-products").textContent = result.valid;
  document.getElementById("error-products").textContent = result.errors;
  document.getElementById("zero-price").textContent = result.zeroPrice;

  const container = document.getElementById("feed-errors");
  container.innerHTML = "";

  // Guardar errores individuales
  for (const item of result.errorList) {
    await supabase.from("feed_errors").insert({
      product_id: item.id || null,
      product_title: item.title,
      errors: item.errors
    });

    // Mostrar en panel
    const div = document.createElement("div");
    div.innerHTML = `<b>${item.title}</b>: ${item.errors.join(", ")}`;
    container.appendChild(div);
  }

  window.cachedProducts = result;
};

window.exportMetaFeed = async function () {
  if (!window.cachedProducts) {
    await window.syncCatalog();
  }

  await exportMeta(window.cachedProducts);
};
