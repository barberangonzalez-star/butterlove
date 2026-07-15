# Butter Love — Ecommerce

Sitio de presentación y pedidos para Butter Love (mantequillas de maní, pistacho, almendras y merey), inspirado visualmente en drinkcharlies.com con paleta pastel propia por sabor.

## Cómo funciona

- Catálogo con precio y tamaño (230g / 350g) por producto.
- Carrito lateral (persistente en el navegador).
- El botón "Confirmar pedido por WhatsApp" arma automáticamente el mensaje con los productos, cantidades y total, y lo abre en WhatsApp para que el cliente lo envíe. Ahí es donde entra tu automatización (Camila) para tomar el pedido.

## Antes de publicar

1. Abre `src/lib/config.ts` y reemplaza `WHATSAPP_NUMBER` por tu número real de WhatsApp Business (formato: código de país + número, sin `+` ni espacios). Ej: `584121234567`.
2. Revisa/edita textos y precios en `src/lib/products.ts`.
3. (Opcional) agrega tu dominio y conecta Supabase cuando quieras guardar pedidos automáticamente en vez de solo mandarlos por WhatsApp.

## Desarrollo local

```bash
npm install
npm run dev
```

## Deploy

Recomendado: subir a GitHub y conectar el repo en Vercel (deploy automático, gratis para este tamaño de proyecto).

```bash
npm run build
```
