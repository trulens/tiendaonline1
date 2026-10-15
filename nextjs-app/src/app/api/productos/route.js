import { NextResponse } from "next/server";
import { supabaseAdminRequest } from "../../../lib/supabase-admin";
import { PRODUCTS } from "../../../data/products";

// Convierte el catálogo predefinido al formato de mercadería
function getFallbackProducts() {
    return PRODUCTS.map((prod, idx) => ({
        id: prod.id || `prod-${idx + 1}`,
        codigo_sistema: prod.id || `PROD-${idx + 1}`,
        nombre_autogenerado: prod.name,
        modelo: prod.name,
        categoria: prod.categoryLabel || (prod.category === 'sol' ? 'Gafas de Sol' : prod.category === 'receta' ? 'Lentes con Receta' : prod.category === 'monturas' ? 'Monturas de Diseñador' : 'Lentes de Contacto'),
        material: prod.details?.material || (prod.specs ? prod.specs[0] : "Acetato Premium"),
        marca: prod.brand,
        precio_venta: prod.price,
        imagen: prod.image,
        stock_total: 8,
        activo: true,
        specs: prod.specs || [],
        description: prod.description || "",
        details: prod.details || {}
    }));
}

export async function GET() {
    try {
        const fallback = getFallbackProducts();

        // 1. Intentamos traer el catálogo de mercadería activo desde Supabase
        let productos = null;
        try {
            productos = await supabaseAdminRequest("catalogo_mercaderia", {
                params: {
                    select: "id,codigo_sistema,nombre_autogenerado,modelo,categoria,material,marca_id,etiquetas_publico,etiquetas_tecnicas,precio_venta,activo",
                    activo: "eq.true"
                }
            });
        } catch (dbErr) {
            console.warn("Supabase catalogo no disponible, usando fallback:", dbErr.message);
        }

        // Si Supabase no tiene productos cargados aún, devolvemos el catálogo predefinido
        if (!Array.isArray(productos) || productos.length === 0) {
            return NextResponse.json(fallback);
        }

        // 2. Traemos las marcas y stock de mercadería en paralelo
        const [stockRegistros, marcasRegistros] = await Promise.all([
            supabaseAdminRequest("stock_mercaderia", {
                params: { select: "producto_id,cantidad" }
            }).catch(() => []),
            supabaseAdminRequest("marcas_mercaderia", {
                params: { select: "id,nombre" }
            }).catch(() => [])
        ]);

        const stockList = Array.isArray(stockRegistros) ? stockRegistros : [];
        const marcasList = Array.isArray(marcasRegistros) ? marcasRegistros : [];
        const marcaMap = Object.fromEntries(marcasList.map((m) => [m.id, m.nombre]));

        // Mapa de imágenes según categoría/material de fallback de alta calidad
        const getImageFallback = (prod) => {
            const cat = (prod.categoria || "").toLowerCase();
            const mat = (prod.material || "").toLowerCase();
            if (cat.includes("solar") || cat.includes("sol")) return "/images/sunglasses_wayfarer.jpg";
            if (cat.includes("contacto")) return "/images/contact_lenses.jpg";
            if (mat.includes("metal") || mat.includes("titanio")) return "/images/optics_titanium.jpg";
            return "/images/optics_acetate.jpg";
        };

        // 3. Cruzamos la información: sumamos stock y asignamos marca e imagen
        const productosConStock = productos.map((prod) => {
            const stocksDelProducto = stockList.filter((s) => s.producto_id === prod.id);
            const stockTotal = stocksDelProducto.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);

            return {
                ...prod,
                marca: marcaMap[prod.marca_id] || "Lens Group",
                imagen: prod.imagen || getImageFallback(prod),
                stock_total: stockTotal > 0 ? stockTotal : 5
            };
        });

        // 4. Si hay productos disponibles los enviamos; si no, retornamos el catálogo completo
        const disponibles = productosConStock.filter((prod) => prod.stock_total > 0);
        return NextResponse.json(disponibles.length > 0 ? disponibles : fallback);
    } catch (error) {
        console.error("Error al procesar /api/productos:", error);
        return NextResponse.json(getFallbackProducts());
    }
}