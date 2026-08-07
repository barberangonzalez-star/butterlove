import { FlavorKey } from "./products";

export type PostCategory = "beneficios" | "recetas";

/** Etiqueta visible de cada categoría (tarjetas, encabezados, OG images). */
export const CATEGORY_LABEL: Record<PostCategory, string> = {
  beneficios: "Beneficios",
  recetas: "Receta",
};

export interface Recipe {
  time: string;
  servings: string;
  ingredients: string[];
  steps: string[];
}

/**
 * Bloque del cuerpo con su propio subtítulo. Cada uno se renderiza como <h2>:
 * Google indexa pasajes sueltos de una página, y un encabezado que describe el
 * párrafo que lo sigue es lo que le permite mostrar ese fragmento como
 * respuesta directa a una búsqueda ("¿la mantequilla de maní tiene fibra?").
 */
export interface PostSection {
  heading: string;
  paragraphs: string[];
}

export interface Post {
  slug: string;
  category: PostCategory;
  productKey: FlavorKey;
  title: string;
  excerpt: string;
  readTime: string;
  /**
   * Fecha de publicación en formato ISO (YYYY-MM-DD). Se envía a Google en el
   * JSON-LD como `datePublished`, y alimenta el `lastModified` del sitemap.
   */
  date: string;
  /**
   * Última revisión del contenido, si hubo alguna. Va como `dateModified` y es
   * la señal que hace que Google vuelva a rastrear un post ya indexado.
   */
  updated?: string;
  /** Términos de búsqueda que el post cubre. Van al JSON-LD y al <meta>. */
  keywords: string[];
  /** Párrafos de entrada, antes del primer subtítulo. */
  intro: string[];
  sections: PostSection[];
  recipe?: Recipe;
}

export const posts: Post[] = [
  {
    slug: "beneficios-mantequilla-de-mani",
    date: "2026-03-10",
    updated: "2026-08-07",
    category: "beneficios",
    productKey: "mani",
    title: "Los beneficios de la mantequilla de maní",
    excerpt:
      "Energía, proteína y grasas buenas en cada cucharada: por qué el maní es un clásico que nunca falla.",
    readTime: "4 min",
    keywords: [
      "beneficios de la mantequilla de maní",
      "mantequilla de maní sin azúcar",
      "proteína vegetal",
      "snack saludable",
    ],
    intro: [
      "El maní ha sido durante generaciones una fuente accesible de energía y nutrientes, y no es casualidad: es una leguminosa con un perfil nutricional que la hace especialmente versátil para el día a día.",
    ],
    sections: [
      {
        heading: "Proteína vegetal que sacia",
        paragraphs: [
          "Es rica en proteína vegetal, lo que la convierte en un buen aliado como snack que satisface por más tiempo o como complemento después de entrenar.",
        ],
      },
      {
        heading: "Grasas buenas para el corazón",
        paragraphs: [
          "Aporta grasas mayormente insaturadas, las mismas que se asocian con la salud cardiovascular cuando reemplazan grasas saturadas en la dieta.",
        ],
      },
      {
        heading: "Vitamina E, magnesio y niacina",
        paragraphs: [
          "Es fuente de vitamina E, magnesio y niacina, nutrientes que participan en la producción de energía y en la salud de la piel.",
        ],
      },
      {
        heading: "Fibra para la digestión y la saciedad",
        paragraphs: [
          "También aporta fibra, que ayuda a la digestión y a la sensación de saciedad.",
        ],
      },
      {
        heading: "Un solo ingrediente: maní",
        paragraphs: [
          "Nuestra mantequilla de maní se hace con un solo ingrediente: maní tostado y molido despacio, sin azúcar agregada, para aprovechar todo esto tal como la naturaleza lo pensó.",
        ],
      },
    ],
  },
  {
    slug: "beneficios-mantequilla-de-pistacho",
    date: "2026-03-24",
    updated: "2026-08-07",
    category: "beneficios",
    productKey: "pistacho",
    title: "Los beneficios de la mantequilla de pistacho",
    excerpt:
      "Antioxidantes, potasio y un toque de lujo: todo lo bueno del pistacho, en una cucharada.",
    readTime: "4 min",
    keywords: [
      "beneficios de la mantequilla de pistacho",
      "mantequilla de pistacho natural",
      "antioxidantes",
      "potasio",
    ],
    intro: [
      "El pistacho es uno de los frutos secos con mayor contenido de antioxidantes, compuestos que ayudan a proteger las células del desgaste diario.",
    ],
    sections: [
      {
        heading: "Luteína y zeaxantina para la vista",
        paragraphs: [
          "Contiene luteína y zeaxantina, dos antioxidantes que suelen asociarse con la salud ocular.",
        ],
      },
      {
        heading: "Más potasio que otros frutos secos",
        paragraphs: [
          "Aporta más potasio que muchos otros frutos secos, un mineral clave para la función muscular y nerviosa.",
        ],
      },
      {
        heading: "Energía estable, sin picos ni bajones",
        paragraphs: [
          "La combinación de proteína y fibra ayuda a mantener la energía estable durante el día, sin picos ni bajones.",
        ],
      },
      {
        heading: "Grasas mayormente insaturadas",
        paragraphs: [
          "Sus grasas son mayormente insaturadas, dentro del grupo de las que se consideran más favorables para la dieta.",
        ],
      },
      {
        heading: "Cómo la hacemos",
        paragraphs: [
          "Molemos pistachos seleccionados hasta lograr una crema de color verde intenso y sabor delicado, sin azúcar agregada.",
        ],
      },
    ],
  },
  {
    slug: "beneficios-mantequilla-de-almendras",
    date: "2026-04-07",
    updated: "2026-08-07",
    category: "beneficios",
    productKey: "almendras",
    title: "Los beneficios de la mantequilla de almendras",
    excerpt:
      "Vitamina E, calcio vegetal y una textura suave que se lleva bien con casi todo.",
    readTime: "4 min",
    keywords: [
      "beneficios de la mantequilla de almendras",
      "mantequilla de almendras sin azúcar",
      "vitamina E",
      "calcio vegetal",
    ],
    intro: [
      "La almendra es uno de los frutos secos más completos nutricionalmente, y buena parte de eso se conserva cuando se muele despacio y sin aditivos.",
    ],
    sections: [
      {
        heading: "Vitamina E para proteger las células",
        paragraphs: [
          "Es una fuente destacada de vitamina E, un antioxidante que ayuda a proteger las células y que suele asociarse con la salud de la piel.",
        ],
      },
      {
        heading: "Calcio vegetal y magnesio",
        paragraphs: [
          "Aporta calcio vegetal, algo poco común entre los frutos secos, además de magnesio, que participa en la función muscular y ósea.",
        ],
      },
      {
        heading: "Grasas buenas y fibra: energía sostenida",
        paragraphs: [
          "La combinación de grasas buenas y fibra la hace saciante y una buena fuente de energía sostenida.",
        ],
      },
      {
        heading: "Cómo la hacemos",
        paragraphs: [
          "Molemos almendras lentamente para conservar sus nutrientes, sin aceites añadidos ni azúcar.",
        ],
      },
    ],
  },
  {
    slug: "beneficios-mantequilla-de-merey",
    date: "2026-04-21",
    updated: "2026-08-07",
    category: "beneficios",
    productKey: "merey",
    title: "Los beneficios de la mantequilla de merey",
    excerpt:
      "Cremosidad, magnesio y hierro: la más suave de nuestra familia de mantequillas.",
    readTime: "4 min",
    keywords: [
      "beneficios de la mantequilla de merey",
      "mantequilla de merey venezolano",
      "cashew",
      "magnesio y zinc",
    ],
    intro: [
      "El merey (o cashew) tiene un perfil de grasas que lo hace naturalmente cremoso al molerlo, sin necesidad de agregar nada más.",
    ],
    sections: [
      {
        heading: "Magnesio y zinc",
        paragraphs: [
          "Es fuente de magnesio y zinc, minerales que participan en la función del sistema inmune y en la producción de energía.",
        ],
      },
      {
        heading: "Hierro de origen vegetal",
        paragraphs: [
          "También aporta hierro de origen vegetal, útil dentro de una dieta variada.",
        ],
      },
      {
        heading: "Menos grasa total que otros frutos secos",
        paragraphs: [
          "Tiene una proporción de grasa total menor que otros frutos secos, con predominio de grasas insaturadas.",
        ],
      },
      {
        heading: "Merey 100% venezolano",
        paragraphs: [
          "Usamos merey 100% venezolano, molido hasta lograr una crema suave y ligeramente dulce de forma natural, sin azúcar agregada.",
        ],
      },
    ],
  },
  {
    slug: "receta-bowl-de-avena-con-mantequilla-de-mani",
    date: "2026-05-05",
    updated: "2026-08-07",
    category: "recetas",
    productKey: "mani",
    title: "Bowl de avena con mantequilla de maní y banana",
    excerpt:
      "Un desayuno de 5 minutos que da energía para arrancar el día, sin complicarse.",
    readTime: "5 min",
    keywords: [
      "avena con mantequilla de maní",
      "desayuno saludable rápido",
      "receta con banana",
      "desayuno sin azúcar",
    ],
    intro: [
      "Simple, rápido y de los que se repiten toda la semana: avena caliente, banana y una cucharada generosa de mantequilla de maní.",
    ],
    sections: [
      {
        heading: "Por qué funciona",
        paragraphs: [
          "La avena aporta carbohidratos de digestión lenta, la banana da dulzor sin necesidad de azúcar agregada y la mantequilla de maní suma proteína y grasas buenas. Entre las tres sostienen la energía hasta el almuerzo.",
        ],
      },
    ],
    recipe: {
      time: "5 min",
      servings: "1 porción",
      ingredients: [
        "1/2 taza de avena en hojuelas",
        "1 taza de agua o leche vegetal",
        "1 banana",
        "1 cucharada de mantequilla de maní Butter Love",
        "Canela al gusto",
        "Opcional: chispas de cacao o semillas de chía",
      ],
      steps: [
        "Cocina la avena con el agua o leche vegetal a fuego medio por unos 5 minutos, revolviendo de vez en cuando.",
        "Sirve en un bowl y agrega la banana en rodajas.",
        "Corona con una cucharada generosa de mantequilla de maní Butter Love.",
        "Espolvorea canela y lo que quieras agregar encima.",
        "Listo: desayuno rápido y con energía para arrancar el día.",
      ],
    },
  },
  {
    slug: "receta-toast-de-mantequilla-de-pistacho-y-fresas",
    date: "2026-05-19",
    updated: "2026-08-07",
    category: "recetas",
    productKey: "pistacho",
    title: "Toast integral con mantequilla de pistacho y fresas",
    excerpt:
      "Pan tostado, pistacho y fresas frescas: una merienda que se ve tan bien como sabe.",
    readTime: "5 min",
    keywords: [
      "toast con mantequilla de pistacho",
      "merienda saludable",
      "tostada con fresas",
      "desayuno fácil",
    ],
    intro: [
      "Un toast sencillo que funciona igual de bien como desayuno, merienda o antojo dulce a media tarde.",
    ],
    sections: [
      {
        heading: "Por qué funciona",
        paragraphs: [
          "El pan integral pone la fibra, el pistacho las grasas buenas y algo de proteína, y las fresas la frescura y el color. Es de las meriendas que llenan sin caer pesadas.",
        ],
      },
    ],
    recipe: {
      time: "5 min",
      servings: "1 porción",
      ingredients: [
        "1-2 rebanadas de pan integral",
        "Mantequilla de pistacho Butter Love",
        "Fresas en láminas",
        "Opcional: un hilo de miel",
      ],
      steps: [
        "Tuesta el pan hasta que esté dorado y crujiente.",
        "Unta generosamente con mantequilla de pistacho.",
        "Coloca las fresas en láminas encima.",
        "Si quieres, agrega un hilo de miel.",
        "Sirve de inmediato.",
      ],
    },
  },
  {
    slug: "receta-batido-de-mantequilla-de-almendras-y-espinaca",
    date: "2026-06-09",
    updated: "2026-08-07",
    category: "recetas",
    productKey: "almendras",
    title: "Batido verde de almendras y espinaca",
    excerpt:
      "Cremoso, verde y listo en un minuto de licuadora: la forma más fácil de empezar el día.",
    readTime: "5 min",
    keywords: [
      "batido verde con mantequilla de almendras",
      "smoothie de espinaca",
      "desayuno rápido saludable",
      "batido sin azúcar",
    ],
    intro: [
      "Un batido cremoso que no sabe a espinaca gracias a la banana y la mantequilla de almendras. Ideal para desayunos apurados.",
    ],
    sections: [
      {
        heading: "Por qué funciona",
        paragraphs: [
          "La banana congelada da la textura cremosa sin necesidad de hielo de más, y la mantequilla de almendras aporta las grasas buenas que hacen que el batido llene de verdad. La espinaca aporta color y prácticamente no se nota en sabor.",
        ],
      },
    ],
    recipe: {
      time: "5 min",
      servings: "1 porción",
      ingredients: [
        "1 taza de leche vegetal (o agua)",
        "Un puñado de espinaca",
        "1 banana, preferiblemente congelada",
        "1 cucharada de mantequilla de almendras Butter Love",
        "Hielo al gusto",
      ],
      steps: [
        "Coloca todos los ingredientes en la licuadora.",
        "Licúa hasta que quede cremoso y sin grumos.",
        "Prueba y ajusta con más banana si quieres más dulzor natural.",
        "Sirve frío.",
      ],
    },
  },
  {
    slug: "receta-energy-balls-de-mantequilla-de-merey",
    date: "2026-06-23",
    updated: "2026-08-07",
    category: "recetas",
    productKey: "merey",
    title: "Energy balls de merey y avena",
    excerpt:
      "Bolitas energéticas sin horno, perfectas para tener listas en la nevera toda la semana.",
    readTime: "15 min",
    keywords: [
      "energy balls de merey",
      "bolitas energéticas sin horno",
      "snack saludable con avena",
      "meal prep saludable",
    ],
    intro: [
      "Sin horno y con pocos ingredientes: estas bolitas son un snack práctico para tener a la mano cuando da hambre entre comidas.",
    ],
    sections: [
      {
        heading: "Por qué funcionan",
        paragraphs: [
          "Avena, mantequilla de merey y un toque de miel: la mezcla da energía rápida y sostenida a la vez. Se preparan una vez y resuelven el snack de toda la semana, así que valen especialmente la pena si te organizas los domingos.",
        ],
      },
    ],
    recipe: {
      time: "15 min + 30 min de reposo en frío",
      servings: "10 bolitas",
      ingredients: [
        "1 taza de avena en hojuelas",
        "3 cucharadas de mantequilla de merey Butter Love",
        "2 cucharadas de miel o papelón líquido",
        "Una pizca de sal",
        "Opcional: coco rallado para cubrir",
      ],
      steps: [
        "Mezcla la avena, la mantequilla de merey, la miel y la sal en un bowl hasta integrar bien.",
        "Forma bolitas pequeñas con las manos.",
        "Si quieres, pásalas por coco rallado.",
        "Refrigera al menos 30 minutos antes de comer.",
        "Guarda en la nevera hasta por una semana.",
      ],
    },
  },
];

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);

/** Todo el texto del post, plano. Alimenta `articleBody` y `wordCount`. */
export function postPlainText(post: Post): string {
  return [
    ...post.intro,
    ...post.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
  ].join("\n\n");
}

/**
 * Posts relacionados: primero el otro post del mismo fruto seco (el par
 * beneficios ↔ receta), y se completa con la misma categoría. Los enlaces
 * internos son la señal más barata que tenemos para que Google descubra y
 * jerarquice el blog: sin ellos cada post queda colgando del listado y nada más.
 */
export function relatedPosts(post: Post, limit = 3): Post[] {
  const others = posts.filter((p) => p.slug !== post.slug);
  const sameProduct = others.filter((p) => p.productKey === post.productKey);
  const sameCategory = others.filter(
    (p) => p.productKey !== post.productKey && p.category === post.category,
  );
  const rest = others.filter(
    (p) => !sameProduct.includes(p) && !sameCategory.includes(p),
  );
  return [...sameProduct, ...sameCategory, ...rest].slice(0, limit);
}

const dateFormatter = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-03-10" -> "10 de marzo de 2026". UTC para que no se corra un día. */
export function formatPostDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

/** "2026-03-10" -> "10 mar 2026". Para el pie de las tarjetas, que es estrecho. */
export function formatPostDateShort(isoDate: string): string {
  return shortDateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}
