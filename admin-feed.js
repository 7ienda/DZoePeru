import { syncCatalogData } from "./feed-sync.js";
import { exportMeta } from "./feed-export.js";

window.syncCatalog = async function () {
  const result = await syncCatalogData();

  document.getElementById("total-products").textContent = result.total;
  document.getElementById("valid-products").textContent = result.valid;
  document.getElementById("error-products").textContent = result.errors;
  document.getElementById("zero-price").textContent = result.zeroPrice;

  const container = document.getElementById("feed-errors");
  container.innerHTML = "";

  result.errorList.forEach(item => {
    const div = document.createElement("div");
    div.innerHTML = `<b>${item.title}</b>: ${item.errors.join(", ")}`;
    container.appendChild(div);
  });

  window.cachedProducts = result;
};

window.exportMetaFeed = async function () {
  if (!window.cachedProducts) {
    await window.syncCatalog();
  }
};
