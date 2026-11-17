// Starting catalog built from the photographs the client supplied.
// Names, materials and descriptions are read from the photos and must be
// confirmed by Madison D'Or. Prices are left empty on purpose: a piece with
// no price shows "Price on request" and cannot be bought until one is set
// in the admin panel.

export const seedCategories = [
  {
    slug: "chains",
    nameEn: "Chains",
    nameEs: "Cadenas",
    descriptionEn: "Gold chains to wear alone or with a pendant.",
    descriptionEs: "Cadenas de oro para llevar solas o con un dije.",
    image: "/catalog/flat-curb-chain-1.jpg",
  },
  {
    slug: "pendants",
    nameEn: "Pendants",
    nameEs: "Dijes",
    descriptionEn: "Crosses and solitaires set with precious stones.",
    descriptionEs: "Cruces y solitarios engastados con piedras preciosas.",
    image: "/catalog/emerald-cross-1.jpg",
  },
  {
    slug: "bracelets",
    nameEn: "Bracelets",
    nameEs: "Pulseras",
    descriptionEn: "Link, woven and charm bracelets in gold.",
    descriptionEs: "Pulseras de eslabones, tejidas y con dijes, en oro.",
    image: "/catalog/heart-charm-bracelet-1.jpg",
  },
  {
    slug: "earrings",
    nameEn: "Earrings",
    nameEs: "Aretes",
    descriptionEn: "Hoops and studs for every day.",
    descriptionEs: "Argollas y topos para todos los días.",
    image: "/catalog/slim-hoops-1.jpg",
  },
];

export const seedCollections = [
  {
    slug: "emeralds",
    nameEn: "Emeralds",
    nameEs: "Esmeraldas",
    descriptionEn: "Green stones set in yellow gold: a cross, a solitaire, a pair of studs and a beaded bracelet.",
    descriptionEs: "Piedras verdes engastadas en oro amarillo: una cruz, un solitario, un par de topos y una pulsera de esferas.",
    image: "/editorial/emerald-pendant.jpg",
  },
  {
    slug: "mariner-link",
    nameEn: "Mariner link",
    nameEs: "Eslabón marinero",
    descriptionEn: "The oval anchor link, carried across a chain, bracelets and studs.",
    descriptionEs: "El eslabón ovalado tipo ancla, en cadena, pulseras y topos.",
    image: "/catalog/mariner-chain-1.jpg",
  },
];

type SeedProduct = {
  slug: string;
  sku: string;
  category: string;
  collection?: string;
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  detailsEn: string;
  detailsEs: string;
  images: number;
  featured?: boolean;
  isNew?: boolean;
};

export const seedProducts: SeedProduct[] = [
  {
    slug: "emerald-cross",
    sku: "MD-P-001",
    category: "pendants",
    collection: "emeralds",
    nameEn: "Emerald cross pendant",
    nameEs: "Cruz con esmeraldas",
    descriptionEn:
      "A flared gold cross with a green stone at each point and one at the center, ringed by a halo of small white stones. Shown on a flat mariner chain.",
    descriptionEs:
      "Cruz de oro de brazos acampanados con una piedra verde en cada punta y otra al centro, rodeada por un halo de pequeñas piedras blancas. Se muestra con cadena marinera plana.",
    detailsEn: "Metal: Yellow gold\nStones: Emerald, white accent stones\nChain: Flat mariner link",
    detailsEs: "Metal: Oro amarillo\nPiedras: Esmeralda, piedras blancas de acento\nCadena: Eslabón marinero plano",
    images: 2,
    featured: true,
  },
  {
    slug: "emerald-solitaire-pendant",
    sku: "MD-P-002",
    category: "pendants",
    collection: "emeralds",
    nameEn: "Emerald solitaire pendant",
    nameEs: "Dije solitario de esmeralda",
    descriptionEn:
      "A single round green stone held in four claws beneath a bail lined with small white stones. It hangs from a fine box chain.",
    descriptionEs:
      "Una piedra verde redonda sujeta por cuatro garras bajo una argolla con pequeñas piedras blancas. Cuelga de una cadena fina tipo veneciana.",
    detailsEn: "Metal: Yellow gold\nStone: Emerald, four-claw setting\nChain: Fine box chain",
    detailsEs: "Metal: Oro amarillo\nPiedra: Esmeralda, engaste de cuatro garras\nCadena: Veneciana fina",
    images: 2,
    featured: true,
  },
  {
    slug: "heritage-cross",
    sku: "MD-P-003",
    category: "pendants",
    collection: "emeralds",
    nameEn: "Heritage cross with emerald",
    nameEs: "Cruz clásica con esmeralda",
    descriptionEn:
      "A broad, sculpted cross with pointed arms and one green stone set at its heart. Shown on a fine woven chain.",
    descriptionEs:
      "Cruz ancha y esculpida de brazos en punta con una piedra verde engastada al centro. Se muestra con cadena fina tejida.",
    detailsEn: "Metal: Gold\nStone: Emerald\nChain: Fine woven chain",
    detailsEs: "Metal: Oro\nPiedra: Esmeralda\nCadena: Tejida fina",
    images: 1,
  },
  {
    slug: "flat-curb-chain",
    sku: "MD-C-001",
    category: "chains",
    nameEn: "Flat curb chain",
    nameEs: "Cadena barbada plana",
    descriptionEn:
      "Wide, flat curb links polished to a mirror finish, so the chain lies level against the skin and catches the light along its whole length.",
    descriptionEs:
      "Eslabones barbados anchos y planos, pulidos a espejo, para que la cadena descanse a ras de la piel y refleje la luz en todo su largo.",
    detailsEn: "Metal: Yellow gold\nLink: Flat curb\nFinish: High polish",
    detailsEs: "Metal: Oro amarillo\nEslabón: Barbado plano\nAcabado: Pulido brillante",
    images: 3,
    featured: true,
  },
  {
    slug: "curb-chain",
    sku: "MD-C-002",
    category: "chains",
    nameEn: "Curb chain",
    nameEs: "Cadena barbada",
    descriptionEn: "Close-set curb links with a rounded profile and a steady weight. A chain that works alone or with a pendant.",
    descriptionEs: "Eslabones barbados cerrados, de perfil redondeado y buen peso. Una cadena para llevar sola o con dije.",
    detailsEn: "Metal: Yellow gold\nLink: Curb\nFinish: High polish",
    detailsEs: "Metal: Oro amarillo\nEslabón: Barbado\nAcabado: Pulido brillante",
    images: 2,
  },
  {
    slug: "cuban-chain",
    sku: "MD-C-003",
    category: "chains",
    nameEn: "Cuban link chain",
    nameEs: "Cadena cubana",
    descriptionEn: "Tight, flattened Cuban links that sit close together and drape in a smooth curve.",
    descriptionEs: "Eslabones cubanos cerrados y aplanados que se asientan juntos y caen en una curva suave.",
    detailsEn: "Metal: Yellow gold\nLink: Cuban",
    detailsEs: "Metal: Oro amarillo\nEslabón: Cubano",
    images: 1,
  },
  {
    slug: "bismark-chain",
    sku: "MD-C-004",
    category: "chains",
    nameEn: "Bismark chain",
    nameEs: "Cadena bismark",
    descriptionEn: "Rows of small links woven side by side into a wide, supple band of gold.",
    descriptionEs: "Hileras de pequeños eslabones tejidos uno junto al otro en una banda de oro ancha y flexible.",
    detailsEn: "Metal: Yellow gold\nLink: Bismark weave",
    detailsEs: "Metal: Oro amarillo\nEslabón: Tejido bismark",
    images: 1,
    isNew: true,
  },
  {
    slug: "fine-curb-chain",
    sku: "MD-C-005",
    category: "chains",
    nameEn: "Fine curb chain",
    nameEs: "Cadena barbada fina",
    descriptionEn: "A slimmer curb chain that rests at the collarbone. Light enough to wear every day.",
    descriptionEs: "Una cadena barbada más delgada que descansa a la altura de la clavícula. Ligera para el uso diario.",
    detailsEn: "Metal: Yellow gold\nLink: Fine curb",
    detailsEs: "Metal: Oro amarillo\nEslabón: Barbado fino",
    images: 3,
  },
  {
    slug: "mariner-chain",
    sku: "MD-C-006",
    category: "chains",
    collection: "mariner-link",
    nameEn: "Puffed mariner chain",
    nameEs: "Cadena marinera",
    descriptionEn: "Rounded oval links, each crossed by a center bar, joined into a long chain with a soft, full shape.",
    descriptionEs: "Eslabones ovalados y abombados, cada uno cruzado por una barra central, unidos en una cadena larga de forma suave.",
    detailsEn: "Metal: Yellow gold\nLink: Puffed mariner",
    detailsEs: "Metal: Oro amarillo\nEslabón: Marinero abombado",
    images: 2,
    featured: true,
  },
  {
    slug: "emerald-bead-bracelet",
    sku: "MD-B-001",
    category: "bracelets",
    collection: "emeralds",
    nameEn: "Emerald bead bracelet",
    nameEs: "Pulsera de esferas con esmeralda",
    descriptionEn:
      "Diamond-cut gold beads strung in a row around a square-cut green stone, finished with an adjustable cord closure.",
    descriptionEs:
      "Esferas de oro diamantadas en hilera alrededor de una piedra verde de talla cuadrada, con cierre de cordón ajustable.",
    detailsEn: "Metal: Yellow gold\nStone: Emerald, square cut\nClosure: Adjustable cord",
    detailsEs: "Metal: Oro amarillo\nPiedra: Esmeralda, talla cuadrada\nCierre: Cordón ajustable",
    images: 2,
    featured: true,
    isNew: true,
  },
  {
    slug: "bismark-bracelet",
    sku: "MD-B-002",
    category: "bracelets",
    nameEn: "Bismark bracelet",
    nameEs: "Pulsera bismark",
    descriptionEn: "A woven bismark band with a diamond-cut plate at its center that flashes as the wrist turns.",
    descriptionEs: "Banda tejida bismark con una placa diamantada al centro que destella al girar la muñeca.",
    detailsEn: "Metal: Yellow gold\nLink: Bismark weave\nDetail: Diamond-cut center plate",
    detailsEs: "Metal: Oro amarillo\nEslabón: Tejido bismark\nDetalle: Placa central diamantada",
    images: 2,
  },
  {
    slug: "tricolor-charm-bracelet",
    sku: "MD-B-003",
    category: "bracelets",
    collection: "mariner-link",
    nameEn: "Tricolor mariner bracelet with charm",
    nameEs: "Pulsera marinera tricolor con dije",
    descriptionEn: "Mariner links alternating yellow, white and rose gold, with a small sculpted charm hanging from the chain.",
    descriptionEs: "Eslabones marineros que alternan oro amarillo, blanco y rosado, con un pequeño dije esculpido que cuelga de la cadena.",
    detailsEn: "Metal: Yellow, white and rose gold\nLink: Mariner\nDetail: Sculpted charm",
    detailsEs: "Metal: Oro amarillo, blanco y rosado\nEslabón: Marinero\nDetalle: Dije esculpido",
    images: 3,
  },
  {
    slug: "heart-charm-bracelet",
    sku: "MD-B-004",
    category: "bracelets",
    collection: "mariner-link",
    nameEn: "Mariner bracelet with heart charm",
    nameEs: "Pulsera marinera con corazón",
    descriptionEn: "Puffed mariner links with a polished heart charm. A piece often chosen as a gift.",
    descriptionEs: "Eslabones marineros abombados con un dije de corazón pulido. Una pieza que suele elegirse para regalar.",
    detailsEn: "Metal: Yellow gold\nLink: Puffed mariner\nDetail: Heart charm",
    detailsEs: "Metal: Oro amarillo\nEslabón: Marinero abombado\nDetalle: Dije de corazón",
    images: 2,
    featured: true,
  },
  {
    slug: "teddy-charm-bracelet",
    sku: "MD-B-005",
    category: "bracelets",
    collection: "mariner-link",
    nameEn: "Mariner bracelet with teddy charm",
    nameEs: "Pulsera marinera con osito",
    descriptionEn: "A fine mariner bracelet carrying a small teddy bear charm.",
    descriptionEs: "Pulsera marinera fina con un pequeño dije de osito.",
    detailsEn: "Metal: Yellow gold\nLink: Mariner\nDetail: Teddy bear charm",
    detailsEs: "Metal: Oro amarillo\nEslabón: Marinero\nDetalle: Dije de osito",
    images: 1,
  },
  {
    slug: "flat-link-bracelet",
    sku: "MD-B-006",
    category: "bracelets",
    nameEn: "Flat link bracelet",
    nameEs: "Pulsera de eslabón plano",
    descriptionEn: "A slim bracelet of flat, close-set links. Easy to stack or to wear alone.",
    descriptionEs: "Pulsera delgada de eslabones planos y cerrados. Fácil de combinar o de llevar sola.",
    detailsEn: "Metal: Yellow gold\nLink: Flat link",
    detailsEs: "Metal: Oro amarillo\nEslabón: Plano",
    images: 1,
  },
  {
    slug: "emerald-studs",
    sku: "MD-E-001",
    category: "earrings",
    collection: "emeralds",
    nameEn: "Emerald stud earrings",
    nameEs: "Topos de esmeralda",
    descriptionEn: "A pair of round green stones in gold claw settings. Presented in a lit box.",
    descriptionEs: "Un par de piedras verdes redondas en engaste de garras de oro. Se presentan en estuche con luz.",
    detailsEn: "Metal: Yellow gold\nStone: Emerald, round\nSetting: Claw",
    detailsEs: "Metal: Oro amarillo\nPiedra: Esmeralda, redonda\nEngaste: Garras",
    images: 1,
    featured: true,
  },
  {
    slug: "slim-hoops",
    sku: "MD-E-002",
    category: "earrings",
    nameEn: "Slim hoop earrings",
    nameEs: "Argollas delgadas",
    descriptionEn: "Large, fine gold hoops with a continuous closure, so the circle reads as one unbroken line.",
    descriptionEs: "Argollas grandes y finas de oro con cierre continuo, para que el círculo se vea como una sola línea.",
    detailsEn: "Metal: Yellow gold\nStyle: Large hoop\nClosure: Endless",
    detailsEs: "Metal: Oro amarillo\nEstilo: Argolla grande\nCierre: Continuo",
    images: 1,
    featured: true,
  },
  {
    slug: "twist-hoops",
    sku: "MD-E-003",
    category: "earrings",
    nameEn: "Twisted mini hoops",
    nameEs: "Argollas mini torcidas",
    descriptionEn: "Small hoops with a rope twist that gives the gold more texture than a plain hoop.",
    descriptionEs: "Argollas pequeñas con torsión tipo cordón que da al oro más textura que una argolla lisa.",
    detailsEn: "Metal: Yellow gold\nStyle: Mini hoop, rope twist",
    detailsEs: "Metal: Oro amarillo\nEstilo: Argolla mini, torsión cordón",
    images: 1,
  },
  {
    slug: "mariner-studs",
    sku: "MD-E-004",
    category: "earrings",
    collection: "mariner-link",
    nameEn: "Mariner link studs",
    nameEs: "Topos marineros",
    descriptionEn: "A single mariner link on each ear. They match the mariner chain and bracelets.",
    descriptionEs: "Un eslabón marinero en cada oreja. Hacen juego con la cadena y las pulseras marineras.",
    detailsEn: "Metal: Yellow gold\nStyle: Stud, mariner link",
    detailsEs: "Metal: Oro amarillo\nEstilo: Topo, eslabón marinero",
    images: 1,
  },
];

// Order of the "Our selection" sort and of the featured pieces on the home page.
export const curatedOrder = [
  "flat-curb-chain", "emerald-solitaire-pendant", "heart-charm-bracelet", "slim-hoops", "emerald-studs",
  "emerald-cross", "mariner-chain", "emerald-bead-bracelet", "curb-chain", "tricolor-charm-bracelet",
  "twist-hoops", "heritage-cross", "bismark-chain", "bismark-bracelet", "mariner-studs",
  "fine-curb-chain", "teddy-charm-bracelet", "cuban-chain", "flat-link-bracelet",
];

export const seedSettings: Record<string, string> = {
  contactEmail: "Madisondor18k@gmail.com",
  contactPhone: "",
  whatsapp: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  address: "",
  hoursEn: "",
  hoursEs: "",
  announcementEn: "Complimentary shipping on every order within the United States",
  announcementEs: "Envío sin costo en todos los pedidos dentro de Estados Unidos",
};
