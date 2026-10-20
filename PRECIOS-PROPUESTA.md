# Propuesta de precios — Butter Love

> Borrador del 2026-10-20. **Nada de esto está aplicado todavía**: ni en la base
> de datos ni en el código. Es para retomarlo y decidir.

## Por qué

Gabriel se muda de Caracas a Caucagua por 3 a 6 meses y monta allá, en casa de
sus padres, el centro de producción. Busca aliados en Caracas que guarden
producto para que los deliveries lo retiren ahí.

Para escalar, la apuesta son los **envíos nacionales**, pero sin descuidar
Caracas. Por eso las promos de los ads van con esta figura:

> **"Delivery gratis a toda Caracas · Envío gratis a todo el país"**

## Cómo funciona

- **Promos (para ads):** combos con el envío ya metido en el precio, unos
  **$4–5 más** que el combo de hoy. Ejemplo: dúo de maní de ~$12 → **$18**.
  Se crean para todos los productos.
- **Tienda normal:** el envío se sigue cobrando aparte, por zona en Caracas y
  con el flete en la agencia para el resto del país.
- **Precios base más altos**, para que la promo se lea como ahorro y no como
  un sobreprecio.
- No hay umbral de envío gratis por monto: la regla de los $35 se descartó.

### La regla que tiene que cumplir cada promo

```
2 frascos sueltos + costo del envío (~$4.50)  >  precio de la promo
```

En Caracas el envío va de $2 a $5.60 según la zona; para el cálculo se usó $4.50.

## Precios base propuestos (frasco de 230g)

| Sabor     | Hoy    | Propuesto |
|-----------|--------|-----------|
| Maní      | $6.99  | **$8.50** |
| Chocomaní | $8.50  | **$9.50** |
| Almendras | $12.99 | **$14.50** |
| Merey     | $12.99 | **$14.50** |
| Pistacho  | $24.99 | **$26.00** |

## Promos con envío incluido

| Promo                | Dúo hoy    | Promo   | 2 sueltos nuevos | Sueltos + envío | El cliente ahorra |
|----------------------|------------|---------|------------------|-----------------|-------------------|
| 2 Maní               | $12.99     | **$18** | $17.00           | $21.50          | $3.50             |
| 2 Chocomaní          | (no existe) | **$21** | $19.00          | $23.50          | $2.50             |
| Maní + Chocomaní     | $14.00     | **$19** | $18.00           | $22.50          | $3.50             |
| Merey + Maní         | $16.99     | **$22** | $23.00           | $27.50          | $5.50             |
| Almendras + Merey    | $22.00     | **$27** | $29.00           | $33.50          | $6.50             |
| Pistacho + Almendras | $38.00     | **$43** | $40.50           | $45.00          | $2.00             |

Observaciones:

- **Pistacho + Almendras** es la más apretada: el cliente ahorra $2 y el margen
  del pistacho ya es fino. Podría quedar en $42.
- **Almendras + Merey** y **Merey + Maní** quedan muy generosas: salen más
  baratas que los dos frascos sueltos incluso sin contar el envío. Se les
  podrían subir $1–2.
- Hoy ya existe en producción el combo nacional de 2 maní a **$18.99**
  (`combo-nacional-mani`, landing `/envio-gratis-mani`). Con esta propuesta
  pasaría a $18.

## Pendiente de decidir

1. ¿Los dúos de la tienda siguen existiendo a su precio sin envío, o las promos
   los reemplazan?
2. ¿Los packs de `/promomani` (Trío Maní $16.99, Pack Familiar $29.99, y los
   agregados Chocomaní $6 y Merey $9.99) también pasan a promo con envío
   incluido, a +$5?
3. Frascos de 350g (hoy: Maní $8, Chocomaní $10, Almendras $15, Merey $15,
   Pistacho $32): ¿suben en proporción o salen de la venta? Ojo: con el maní
   de 230g a $8.50, el de 350g a $8 quedaría más barato.
4. ¿El delivery en Caracas también sale gratis con cualquier promo? Hoy el
   combo nacional ya lo da gratis en todas las zonas.

## Lo que se tocaría al aplicarlo

- **Base de datos:** un solo script que fije todos los precios y cree las
  promos nuevas, que se pueda correr varias veces sin duplicar nada.
- `src/lib/config.ts`: la lista de combos con envío incluido (`FREE_SHIPPING_KEYS`).
- `src/lib/combo-components.ts`: los frascos de cada promo nueva, para el inventario.
- `src/app/promomani/packs.ts` y `src/app/envio-gratis-mani/page.tsx`: las landings.
- `src/app/promomani/page.tsx`: texto escrito a mano con "$6.99 suelto".
- Scripts viejos con precios escritos (`add-combo-products.ts`,
  `add-chocomani.ts`, `add-mani-promo-packs.ts`, `add-duo-mani-chocomani.ts`,
  `add-landing-mani-extras.ts`, `add-combo-nacional-mani.ts`): actualizar sus
  números, o si alguien los vuelve a correr revierten los precios nuevos.
- La página al mayor (`/ventasalmayor`) calcula sus precios desde el precio de
  la tienda (30% menos, con piso de margen), así que sube sola.
