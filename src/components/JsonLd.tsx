/**
 * Inserta datos estructurados en la página.
 *
 * El `<` se escapa a su equivalente unicode para que ningún texto que venga de
 * la base de datos (descripciones, badges) pueda cerrar el <script> e inyectar
 * HTML. Es la recomendación oficial de Next para JSON-LD.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
