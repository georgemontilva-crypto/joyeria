-- Studio cut-out photos (November 2026).
-- Brings an already-seeded catalog in line with server/db/seed-data.ts:
--   * six pieces swap their first-batch photos for the studio ones in /catalog/v2
--   * five pieces that only exist in the new photos are added, plus a Rings category
--   * pieces with studio photos move to the front of "Our selection"
-- Every statement is a no-op on an empty database (the seed then loads the final
-- catalog) and is safe to run on a catalog that has been edited in the admin panel:
-- prices, stock, texts and photos uploaded from the panel are left alone.

UPDATE `products` SET `sort_order` = `sort_order` + 11;
--> statement-breakpoint
UPDATE `products` SET `sort_order` = 0 WHERE `slug` = 'mariner-chain';
--> statement-breakpoint
UPDATE `products` SET `sort_order` = 1 WHERE `slug` = 'heart-charm-bracelet';
--> statement-breakpoint
UPDATE `products` SET `sort_order` = 2 WHERE `slug` = 'slim-hoops';
--> statement-breakpoint
UPDATE `products` SET `sort_order` = 5 WHERE `slug` = 'tricolor-charm-bracelet';
--> statement-breakpoint
UPDATE `products` SET `sort_order` = 7 WHERE `slug` = 'mariner-studs';
--> statement-breakpoint
UPDATE `products` SET `sort_order` = 10 WHERE `slug` = 'twist-hoops';
--> statement-breakpoint

INSERT INTO `categories` (`slug`, `name_en`, `name_es`, `description_en`, `description_es`, `image`, `sort_order`)
SELECT 'rings', 'Rings', 'Anillos', 'Gold rings, plain or set with stones.', 'Anillos de oro, lisos o con piedras.', '/catalog/v2/bypass-ring-1.jpg', 4
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `products`)
  AND NOT EXISTS (SELECT 1 FROM `categories` c WHERE c.`slug` = 'rings');
--> statement-breakpoint
UPDATE `categories` SET `image` = '/catalog/v2/mariner-chain-1.jpg' WHERE `slug` = 'chains' AND `image` = '/catalog/flat-curb-chain-1.jpg';
--> statement-breakpoint
UPDATE `categories` SET `image` = '/catalog/v2/heart-charm-bracelet-1.jpg' WHERE `slug` = 'bracelets' AND `image` = '/catalog/heart-charm-bracelet-1.jpg';
--> statement-breakpoint
UPDATE `categories` SET `image` = '/catalog/v2/slim-hoops-1.jpg' WHERE `slug` = 'earrings' AND `image` = '/catalog/slim-hoops-1.jpg';
--> statement-breakpoint
UPDATE `categories` SET `description_en` = 'Hoops, studs and drops.' WHERE `slug` = 'earrings' AND `description_en` = 'Hoops and studs for every day.';
--> statement-breakpoint
UPDATE `categories` SET `description_es` = 'Argollas, topos y aretes de gota.' WHERE `slug` = 'earrings' AND `description_es` = 'Argollas y topos para todos los días.';
--> statement-breakpoint
UPDATE `collections` SET `image` = '/catalog/v2/mariner-chain-2.jpg' WHERE `slug` = 'mariner-link' AND `image` = '/catalog/mariner-chain-1.jpg';
--> statement-breakpoint

INSERT INTO `products` (`slug`, `sku`, `name_en`, `name_es`, `description_en`, `description_es`, `details_en`, `details_es`, `price_cents`, `stock`, `category_id`, `collection_id`, `featured`, `is_new`, `active`, `sort_order`)
SELECT 'bypass-ring', 'MD-R-001', 'Two-sphere ring', 'Anillo de dos esferas',
  'An open band that ends in two spheres: one polished, one set with small white stones.',
  'Aro abierto que termina en dos esferas: una pulida y otra engastada con pequeñas piedras blancas.',
  'Metal: Yellow gold\nStones: White accent stones\nStyle: Open band',
  'Metal: Oro amarillo\nPiedras: Piedras blancas de acento\nEstilo: Aro abierto',
  NULL, 1, (SELECT `id` FROM `categories` WHERE `slug` = 'rings'), NULL, 1, 1, 1, 3
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `products` p0)
  AND NOT EXISTS (SELECT 1 FROM `products` p WHERE p.`slug` = 'bypass-ring');
--> statement-breakpoint
INSERT INTO `products` (`slug`, `sku`, `name_en`, `name_es`, `description_en`, `description_es`, `details_en`, `details_es`, `price_cents`, `stock`, `category_id`, `collection_id`, `featured`, `is_new`, `active`, `sort_order`)
SELECT 'sun-charm-bracelet', 'MD-B-009', 'Mariner bracelet with sun charm', 'Pulsera marinera con sol',
  'Puffed mariner links with a round sun charm, its face ringed by small gold beads.',
  'Eslabones marineros abombados con un dije redondo de sol, de rostro rodeado por pequeñas esferas de oro.',
  'Metal: Yellow gold\nLink: Puffed mariner\nDetail: Sun charm',
  'Metal: Oro amarillo\nEslabón: Marinero abombado\nDetalle: Dije de sol',
  NULL, 1, (SELECT `id` FROM `categories` WHERE `slug` = 'bracelets'), (SELECT `id` FROM `collections` WHERE `slug` = 'mariner-link'), 1, 1, 1, 4
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `products` p0)
  AND NOT EXISTS (SELECT 1 FROM `products` p WHERE p.`slug` = 'sun-charm-bracelet');
--> statement-breakpoint
INSERT INTO `products` (`slug`, `sku`, `name_en`, `name_es`, `description_en`, `description_es`, `details_en`, `details_es`, `price_cents`, `stock`, `category_id`, `collection_id`, `featured`, `is_new`, `active`, `sort_order`)
SELECT 'drop-earrings', 'MD-E-005', 'Faceted drop earrings', 'Aretes de gota facetados',
  'Teardrop drops with a faceted surface that mirrors the light, hung from lever-back hooks.',
  'Gotas de superficie facetada que refleja la luz, colgadas de ganchos con cierre de palanca.',
  'Metal: Yellow gold\nStyle: Drop\nClosure: Lever back',
  'Metal: Oro amarillo\nEstilo: Gota\nCierre: Palanca',
  NULL, 1, (SELECT `id` FROM `categories` WHERE `slug` = 'earrings'), NULL, 0, 1, 1, 6
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `products` p0)
  AND NOT EXISTS (SELECT 1 FROM `products` p WHERE p.`slug` = 'drop-earrings');
--> statement-breakpoint
INSERT INTO `products` (`slug`, `sku`, `name_en`, `name_es`, `description_en`, `description_es`, `details_en`, `details_es`, `price_cents`, `stock`, `category_id`, `collection_id`, `featured`, `is_new`, `active`, `sort_order`)
SELECT 'dolphin-charm-bracelet', 'MD-B-008', 'Mariner bracelet with dolphin charm', 'Pulsera marinera con delfín',
  'A fine mariner bracelet with a small dolphin charm near the clasp and an extension chain to adjust the fit.',
  'Pulsera marinera fina con un pequeño dije de delfín junto al broche y cadena de extensión para ajustar el largo.',
  'Metal: Yellow gold\nLink: Mariner\nDetail: Dolphin charm\nClosure: Clasp with extension chain',
  'Metal: Oro amarillo\nEslabón: Marinero\nDetalle: Dije de delfín\nCierre: Broche con cadena de extensión',
  NULL, 1, (SELECT `id` FROM `categories` WHERE `slug` = 'bracelets'), (SELECT `id` FROM `collections` WHERE `slug` = 'mariner-link'), 0, 1, 1, 8
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `products` p0)
  AND NOT EXISTS (SELECT 1 FROM `products` p WHERE p.`slug` = 'dolphin-charm-bracelet');
--> statement-breakpoint
INSERT INTO `products` (`slug`, `sku`, `name_en`, `name_es`, `description_en`, `description_es`, `details_en`, `details_es`, `price_cents`, `stock`, `category_id`, `collection_id`, `featured`, `is_new`, `active`, `sort_order`)
SELECT 'tricolor-mariner-bracelet', 'MD-B-007', 'Tricolor mariner bracelet', 'Pulsera marinera tricolor',
  'Slim mariner links alternating yellow, white and rose gold, with an extension chain to adjust the fit.',
  'Eslabones marineros delgados que alternan oro amarillo, blanco y rosado, con cadena de extensión para ajustar el largo.',
  'Metal: Yellow, white and rose gold\nLink: Fine mariner\nClosure: Clasp with extension chain',
  'Metal: Oro amarillo, blanco y rosado\nEslabón: Marinero fino\nCierre: Broche con cadena de extensión',
  NULL, 1, (SELECT `id` FROM `categories` WHERE `slug` = 'bracelets'), (SELECT `id` FROM `collections` WHERE `slug` = 'mariner-link'), 0, 1, 1, 9
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `products` p0)
  AND NOT EXISTS (SELECT 1 FROM `products` p WHERE p.`slug` = 'tricolor-mariner-bracelet');
--> statement-breakpoint

-- Drop the first-batch photos of the pieces that now have studio photos.
DELETE pi FROM `product_images` pi
JOIN `products` p ON p.`id` = pi.`product_id`
WHERE p.`slug` IN ('mariner-chain', 'tricolor-charm-bracelet', 'heart-charm-bracelet', 'twist-hoops', 'slim-hoops', 'mariner-studs')
  AND pi.`url` LIKE '/catalog/%'
  AND pi.`url` NOT LIKE '/catalog/v2/%';
--> statement-breakpoint
-- Any photo added from the admin panel stays, after the studio ones.
UPDATE `product_images` pi
JOIN `products` p ON p.`id` = pi.`product_id`
SET pi.`sort_order` = pi.`sort_order` + 10
WHERE p.`slug` IN ('mariner-chain', 'tricolor-charm-bracelet', 'heart-charm-bracelet', 'twist-hoops', 'slim-hoops', 'mariner-studs')
  AND pi.`url` NOT LIKE '/catalog/v2/%';
--> statement-breakpoint
INSERT INTO `product_images` (`product_id`, `url`, `sort_order`)
SELECT p.`id`, v.`url`, v.`sort_order`
FROM `products` p
JOIN (
  SELECT 'mariner-chain' AS `slug`, '/catalog/v2/mariner-chain-1.jpg' AS `url`, 0 AS `sort_order`
  UNION ALL SELECT 'mariner-chain', '/catalog/v2/mariner-chain-2.jpg', 1
  UNION ALL SELECT 'tricolor-charm-bracelet', '/catalog/v2/tricolor-charm-bracelet-1.jpg', 0
  UNION ALL SELECT 'tricolor-charm-bracelet', '/catalog/v2/tricolor-charm-bracelet-2.jpg', 1
  UNION ALL SELECT 'heart-charm-bracelet', '/catalog/v2/heart-charm-bracelet-1.jpg', 0
  UNION ALL SELECT 'heart-charm-bracelet', '/catalog/v2/heart-charm-bracelet-2.jpg', 1
  UNION ALL SELECT 'twist-hoops', '/catalog/v2/twist-hoops-1.jpg', 0
  UNION ALL SELECT 'slim-hoops', '/catalog/v2/slim-hoops-1.jpg', 0
  UNION ALL SELECT 'mariner-studs', '/catalog/v2/mariner-studs-1.jpg', 0
  UNION ALL SELECT 'mariner-studs', '/catalog/v2/mariner-studs-2.jpg', 1
  UNION ALL SELECT 'tricolor-mariner-bracelet', '/catalog/v2/tricolor-mariner-bracelet-1.jpg', 0
  UNION ALL SELECT 'tricolor-mariner-bracelet', '/catalog/v2/tricolor-mariner-bracelet-2.jpg', 1
  UNION ALL SELECT 'dolphin-charm-bracelet', '/catalog/v2/dolphin-charm-bracelet-1.jpg', 0
  UNION ALL SELECT 'dolphin-charm-bracelet', '/catalog/v2/dolphin-charm-bracelet-2.jpg', 1
  UNION ALL SELECT 'sun-charm-bracelet', '/catalog/v2/sun-charm-bracelet-1.jpg', 0
  UNION ALL SELECT 'sun-charm-bracelet', '/catalog/v2/sun-charm-bracelet-2.jpg', 1
  UNION ALL SELECT 'drop-earrings', '/catalog/v2/drop-earrings-1.jpg', 0
  UNION ALL SELECT 'bypass-ring', '/catalog/v2/bypass-ring-1.jpg', 0
) v ON v.`slug` = p.`slug`
WHERE NOT EXISTS (
  SELECT 1 FROM (SELECT `product_id`, `url` FROM `product_images`) x
  WHERE x.`product_id` = p.`id` AND x.`url` = v.`url`
);
