/**
 * Crea las tablas de reseñas: `review_invites` (enlaces hechos a mano),
 * `review_requests` (a qué ventas ya se les pidió) y `reviews` (lo que
 * opinaron).
 *
 * Tiene que correr ANTES de publicar el código de reseñas: la home, las fichas
 * de producto y el panel las consultan, y sin ellas el build falla.
 *
 * Idempotente: sólo crea lo que falta y no toca nada que ya exista, así que
 * sirve también para ponerle al día una base que tenía una versión anterior de
 * estas tablas. Los nombres de las restricciones son los mismos que usaría
 * drizzle-kit, así que un `drizzle-kit push` posterior no las ve como
 * distintas.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/create-reviews-tables.ts
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS review_invites (
      id serial PRIMARY KEY,
      customer_name text NOT NULL,
      customer_phone text,
      product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS review_requests (
      sale_id integer PRIMARY KEY,
      asked_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT review_requests_sale_id_sales_id_fk
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE cascade
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id serial PRIMARY KEY,
      sale_id integer,
      product_id integer NOT NULL,
      rating integer NOT NULL,
      comment text,
      author_name text NOT NULL,
      status text NOT NULL DEFAULT 'pendiente',
      reply text,
      created_at timestamp NOT NULL DEFAULT now(),
      published_at timestamp,
      CONSTRAINT reviews_sale_id_sales_id_fk
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE set null,
      CONSTRAINT reviews_product_id_products_id_fk
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE cascade,
      CONSTRAINT reviews_rating_check CHECK (rating between 1 and 5)
    )
  `;

  await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS invite_id integer`;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reviews_invite_id_review_invites_id_fk'
      ) THEN
        ALTER TABLE reviews
          ADD CONSTRAINT reviews_invite_id_review_invites_id_fk
          FOREIGN KEY (invite_id) REFERENCES review_invites(id) ON DELETE set null;
      END IF;
    END $$
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS reviews_sale_product_idx
      ON reviews (sale_id, product_id)
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS reviews_invite_product_idx
      ON reviews (invite_id, product_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS reviews_product_status_idx
      ON reviews (product_id, status)
  `;

  console.log("Tablas de reseñas listas.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
