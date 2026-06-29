import { syncCatalogData } from "./feed-sync.js";
import { exportMeta } from "./feed-export.js";
import supabase from "./supabase-feed.js";

window.syncCatalog = async function () {
  try {
    const result = await syncCatalogData();

    // ── 1. Log general ────────────────────────────────────────────
    const { error: logError } = await supabase.from("feed_logs").insert({
      total_products:  result.total,
      valid_products:  result.valid,
      error_products:  result.errors,
      zero_price_products: result.zeroPrice
    });
    if (logError) console.error("Error guardando log:", logError.message);

    // ── 2. Actualizar dashboard ───────────────────────────────────
    document.getElementById("total-products").textContent = result.total;
    document.getElementById("valid-products").textContent = result.valid;
    document.getElementById("error-products").textContent = result.errors;
    document.getElementById("zero-price").textContent    = result.zeroPrice;

    // ── 3. Errores individuales — limpiar antes de reinsertar ─────
    //    Evita duplicados acumulados en cada sync
    await supabase.from("feed_errors").delete().neq("id", 0);

    // Insert en bulk (1 sola request en vez de N)
    if (result.errorList.length > 0) {
      const rows = result.errorList.map(item => ({
        product_id:    item.id    || null,
        product_title: item.title,
        errors:        item.errors          // array guardado como jsonb
      }));
      const { error: errInsert } = await supabase.from("feed_errors").insert(rows);
      if (errInsert) console.error("Error guardando errores:", errInsert.message);
    }

    // ── 4. Renderizar errores en el panel ─────────────────────────
    const container = document.getElementById("feed-errors");
    container.innerHTML = "";
    for (const item of result.errorList) {
      const div = document.createElement("div");
      div.innerHTML = `<b>${item.title}</b>: ${item.errors.join(", ")}`;
      container.appendChild(div);
    }

    window.cachedProducts = result;

  } catch (err) {
    console.error("syncCatalog falló:", err);
    // Mostrar error visible en el panel si existe el contenedor
    const container = document.getElementById("feed-errors");
    if (container) {
      container.innerHTML = `<div style="color:red;font-weight:bold;">
        ❌ Error al sincronizar: ${err.message}
      </div>`;
    }
  }
};

window.exportMetaFeed = async function () {
  try {
    if (!window.cachedProducts) {
      await window.syncCatalog();
    }
    await exportMeta(window.cachedProducts);
  } catch (err) {
    console.error("exportMetaFeed falló:", err);
  }
};
