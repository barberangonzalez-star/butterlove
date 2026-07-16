import { FlavorKey } from "./products";

export type PostCategory = "beneficios" | "recetas";

export interface Recipe {
  time: string;
  servings: string;
  ingredients: string[];
  steps: string[];
}

export interface Post {
  slug: string;
  category: PostCategory;
  productKey: FlavorKey;
  title: string;
  excerpt: string;
  readTime: string;
  body: string[];
  recipe?: Recipe;
}

export const posts: Post[] = [
  {
    slug: "beneficios-mantequilla-de-mani",
    category: "beneficios",
    productKey: "mani",
    title: "Los beneficios de la mantequilla de maní",
    excerpt:
      "Energía, proteína y grasas buenas en cada cucharada: por qué el maní es un clásico que nunca falla.",
    readTime: "4 min",
    body: [
      "El maní ha sido durante generaciones una fuente accesible de energía y nutrientes, y no es casualidad: es una leguminosa con un perfil nutricional que la hace especialmente versátil para el día a día.",
      "Es rica en proteína vegetal, lo que la convierte en un buen aliado como snack que satisface por más tiempo o como complemento después de entrenar.",
      "Aporta grasas mayormente insaturadas, las mismas que se asocian con la salud cardiovascular cuando reemplazan grasas saturadas en la dieta.",
      "Es fuente de vitamina E, magnesio y niacina, nutrientes que participan en la producción de energía y en la salud de la piel.",
      "También aporta fibra, que ayuda a la digestión y a la sensación de saciedad.",
      "Nuestra mantequilla de maní se hace con un solo ingrediente: maní tostado y molido despacio, sin azúcar agregada, para aprovechar todo esto tal como la naturaleza lo pensó.",
    ],
  },
  {
    slug: "beneficios-mantequilla-de-pistacho",
    category: "beneficios",
    productKey: "pistacho",
    title: "Los beneficios de la mantequilla de pistacho",
    excerpt:
      "Antioxidantes, potasio y un toque de lujo: todo lo bueno del pistacho, en una cucharada.",
    readTime: "4 min",
    body: [
      "El pistacho es uno de los frutos secos con mayor contenido de antioxidantes, compuestos que ayudan a proteger las células del desgaste diario.",
      "Contiene luteína y zeaxantina, dos antioxidantes que suelen asociarse con la salud ocular.",
      "Aporta más potasio que muchos otros frutos secos, un mineral clave para la función muscular y nerviosa.",
      "La combinación de proteína y fibra ayuda a mantener la energía estable durante el día, sin picos ni bajones.",
      "Sus grasas son mayormente insaturadas, dentro del grupo de las que se consideran más favorables para la dieta.",
      "Molemos pistachos seleccionados hasta lograr una crema de color verde intenso y sabor delicado, sin azúcar agregada.",
    ],
  },
  {
    slug: "beneficios-mantequilla-de-almendras",
    category: "beneficios",
    productKey: "almendras",
    title: "Los beneficios de la mantequilla de almendras",
    excerpt:
      "Vitamina E, calcio vegetal y una textura suave que se lleva bien con casi todo.",
    readTime: "4 min",
    body: [
      "La almendra es uno de los frutos secos más completos nutricionalmente, y buena parte de eso se conserva cuando se muele despacio y sin aditivos.",
      "Es una fuente destacada de vitamina E, un antioxidante que ayuda a proteger las células y que suele asociarse con la salud de la piel.",
      "Aporta calcio vegetal, algo poco común entre los frutos secos, además de magnesio, que participa en la función muscular y ósea.",
      "La combinación de grasas buenas y fibra la hace saciante y una buena fuente de energía sostenida.",
      "Molemos almendras lentamente para conservar sus nutrientes, sin aceites añadidos ni azúcar.",
    ],
  },
  {
    slug: "beneficios-mantequilla-de-merey",
    category: "beneficios",
    productKey: "merey",
    title: "Los beneficios de la mantequilla de merey",
    excerpt:
      "Cremosidad, magnesio y hierro: la más suave de nuestra familia de mantequillas.",
    readTime: "4 min",
    body: [
      "El merey (o cashew) tiene un perfil de grasas que lo hace naturalmente cremoso al molerlo, sin necesidad de agregar nada más.",
      "Es fuente de magnesio y zinc, minerales que participan en la función del sistema inmune y en la producción de energía.",
      "También aporta hierro de origen vegetal, útil dentro de una dieta variada.",
      "Tiene una proporción de grasa total menor que otros frutos secos, con predominio de grasas insaturadas.",
      "Usamos merey 100% venezolano, molido hasta lograr una crema suave y ligeramente dulce de forma natural, sin azúcar agregada.",
    ],
  },
  {
    slug: "receta-bowl-de-avena-con-mantequilla-de-mani",
    category: "recetas",
    productKey: "mani",
    title: "Bowl de avena con mantequilla de maní y banana",
    excerpt:
      "Un desayuno de 5 minutos que da energía para arrancar el día, sin complicarse.",
    readTime: "5 min",
    body: [
      "Simple, rápido y de los que se repiten toda la semana: avena caliente, banana y una cucharada generosa de mantequilla de maní.",
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
    category: "recetas",
    productKey: "pistacho",
    title: "Toast integral con mantequilla de pistacho y fresas",
    excerpt:
      "Pan tostado, pistacho y fresas frescas: una merienda que se ve tan bien como sabe.",
    readTime: "5 min",
    body: [
      "Un toast sencillo que funciona igual de bien como desayuno, merienda o antojo dulce a media tarde.",
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
    category: "recetas",
    productKey: "almendras",
    title: "Batido verde de almendras y espinaca",
    excerpt:
      "Cremoso, verde y listo en un minuto de licuadora: la forma más fácil de empezar el día.",
    readTime: "5 min",
    body: [
      "Un batido cremoso que no sabe a espinaca gracias a la banana y la mantequilla de almendras. Ideal para desayunos apurados.",
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
    category: "recetas",
    productKey: "merey",
    title: "Energy balls de merey y avena",
    excerpt:
      "Bolitas energéticas sin horno, perfectas para tener listas en la nevera toda la semana.",
    readTime: "15 min",
    body: [
      "Sin horno y con pocos ingredientes: estas bolitas son un snack práctico para tener a la mano cuando da hambre entre comidas.",
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
