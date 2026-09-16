/**
 * Cómo se llama y cómo se ve el asistente del panel.
 *
 * Vive aparte porque el nombre aparece en cuatro sitios —la cabecera del panel,
 * la entrada del menú, el botón flotante y la pestaña del borde— y con cuatro
 * copias sueltas basta cambiarlo una vez para que queden tres diciendo otra
 * cosa. El prompt del servidor tiene su propia copia del nombre, porque de allá
 * no se puede importar un módulo de cliente.
 */
export const ASSISTANT_NAME = "Bruno";
export const ASSISTANT_EMOJI = "🐶";
