# 📦 D'Zoe Perú — Feed de Catálogo para Meta Commerce Manager

## ¿Cómo funciona?

El archivo `generate-catalog.js` se conecta a Supabase, lee todos los productos de la tabla `products`, y genera `catalog.xml` en formato RSS 2.0 compatible con **Meta Commerce Manager** (Facebook/Instagram Shopping).

Una **GitHub Action** regenera el catálogo automáticamente cada 6 horas, de modo que Meta siempre tendrá los datos actualizados (stock, precios, nuevos productos).

El XML queda disponible en:
```
https://dzoeperu.com/catalog.xml
```

---

## Configuración paso a paso

### 1. Agregar Secrets en GitHub

Ve a tu repositorio → **Settings → Secrets and variables → Actions → New repository secret** y crea los dos secretos:

| Nombre | Valor |
|--------|-------|
| `SUPABASE_URL` | `https://uxwmodnadidlsfwtshcq.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (tu anon key completa) |

> **Nota:** La anon key ya está hardcodeada como fallback en el script, pero es buena práctica usar Secrets para no exponerla directamente en el código.

### 2. Subir los archivos a tu repositorio

Agrega al root de tu repo en GitHub:
- `generate-catalog.js`
- `.github/workflows/generate-catalog.yml`

### 3. Ejecutar por primera vez

Ve a **Actions → Generate Meta Commerce Catalog → Run workflow** para generar el `catalog.xml` inmediatamente sin esperar las 6 horas.

### 4. Verificar que el XML esté accesible

Abre en el navegador:
```
https://dzoeperu.com/catalog.xml
```
Debes ver el XML con todos tus productos.

### 5. Registrar el feed en Meta Commerce Manager

1. Ve a [business.facebook.com](https://business.facebook.com) → **Commerce Manager**
2. Selecciona tu catálogo (o crea uno nuevo de tipo **Ecommerce**)
3. **Fuentes de datos → Agregar elementos → Usar una URL de archivo**
4. Ingresa: `https://dzoeperu.com/catalog.xml`
5. Configura actualización: **Programada** → cada hora o diaria
6. ¡Listo! Meta importará y sincronizará tus productos automáticamente.

---

## Campos del feed generados

| Campo XML | Fuente en Supabase |
|-----------|-------------------|
| `g:id` | `products.id` |
| `g:title` | `products.name` |
| `g:description` | `products.description` |
| `g:link` | Generado desde `products.name` → slug |
| `g:image_link` | `products.images[0]` o `products.image` |
| `g:additional_image_link` | `products.images[1..10]` |
| `g:availability` | `products.sizes[].stock > 0` |
| `g:price` | Precio mínimo de `products.sizes[].price` (en PEN) |
| `g:brand` | `D'Zoe Perú` (fijo) |
| `g:condition` | `new` (fijo) |
| `g:google_product_category` | `5323` (Baby & Toddler Clothing) |
| `g:product_type` | `products.categories[]` |
| `g:custom_label_0` | Categorías |
| `g:custom_label_1` | Tallas disponibles |
| `g:custom_label_2` | `Nuevo` (si `is_new = true`) |
| `g:custom_label_3` | `Oferta` (si `on_sale = true`) |
| `g:custom_label_4` | `Destacado` (si `featured = true`) |

---

## Prueba local

```bash
npm install @supabase/supabase-js
node generate-catalog.js
# → genera catalog.xml en la carpeta actual
```
