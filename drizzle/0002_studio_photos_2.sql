-- Second batch of studio cut-out photos (November 2026).
-- Eight more pieces swap their first-batch photos for the studio ones in /catalog/v2,
-- and the Pendants category and Emeralds collection get studio images.
-- Like 0001, every statement is a no-op on an empty database and leaves prices,
-- stock, texts edited in the admin panel and panel-uploaded photos alone.

-- Pieces still on first-batch photos move behind the ones with studio photos.
UPDATE `products` SET `sort_order` = `sort_order` + 100
WHERE `slug` IN ('heritage-cross', 'bismark-bracelet', 'teddy-charm-bracelet', 'cuban-chain', 'flat-link-bracelet');
--> statement-breakpoint

UPDATE `categories` SET `image` = '/catalog/v2/emerald-cross-1.jpg' WHERE `slug` = 'pendants' AND `image` = '/catalog/emerald-cross-1.jpg';
--> statement-breakpoint
UPDATE `collections` SET `image` = '/editorial/v2/emerald-bracelet.jpg' WHERE `slug` = 'emeralds' AND `image` = '/editorial/emerald-pendant.jpg';
--> statement-breakpoint

-- The studio photo shows the bracelet's beads are fluted, not diamond-cut.
UPDATE `products`
SET `description_en` = 'Fluted gold beads strung in a row around a square-cut green stone, finished with an adjustable cord closure.'
WHERE `slug` = 'emerald-bead-bracelet'
  AND `description_en` = 'Diamond-cut gold beads strung in a row around a square-cut green stone, finished with an adjustable cord closure.';
--> statement-breakpoint
UPDATE `products`
SET `description_es` = 'Esferas de oro acanaladas en hilera alrededor de una piedra verde de talla cuadrada, con cierre de cordón ajustable.'
WHERE `slug` = 'emerald-bead-bracelet'
  AND `description_es` = 'Esferas de oro diamantadas en hilera alrededor de una piedra verde de talla cuadrada, con cierre de cordón ajustable.';
--> statement-breakpoint

DELETE pi FROM `product_images` pi
JOIN `products` p ON p.`id` = pi.`product_id`
WHERE p.`slug` IN ('emerald-bead-bracelet', 'curb-chain', 'flat-curb-chain', 'fine-curb-chain', 'bismark-chain', 'emerald-cross', 'emerald-solitaire-pendant', 'emerald-studs')
  AND pi.`url` LIKE '/catalog/%'
  AND pi.`url` NOT LIKE '/catalog/v2/%';
--> statement-breakpoint
-- Any photo added from the admin panel stays, after the studio ones.
UPDATE `product_images` pi
JOIN `products` p ON p.`id` = pi.`product_id`
SET pi.`sort_order` = pi.`sort_order` + 10
WHERE p.`slug` IN ('emerald-bead-bracelet', 'curb-chain', 'flat-curb-chain', 'fine-curb-chain', 'bismark-chain', 'emerald-cross', 'emerald-solitaire-pendant', 'emerald-studs')
  AND pi.`url` NOT LIKE '/catalog/v2/%';
--> statement-breakpoint
INSERT INTO `product_images` (`product_id`, `url`, `sort_order`)
SELECT p.`id`, v.`url`, v.`sort_order`
FROM `products` p
JOIN (
  SELECT 'emerald-bead-bracelet' AS `slug`, '/catalog/v2/emerald-bead-bracelet-1.jpg' AS `url`, 0 AS `sort_order`
  UNION ALL SELECT 'emerald-bead-bracelet', '/catalog/v2/emerald-bead-bracelet-2.jpg', 1
  UNION ALL SELECT 'emerald-bead-bracelet', '/catalog/v2/emerald-bead-bracelet-3.jpg', 2
  UNION ALL SELECT 'curb-chain', '/catalog/v2/curb-chain-1.jpg', 0
  UNION ALL SELECT 'curb-chain', '/catalog/v2/curb-chain-2.jpg', 1
  UNION ALL SELECT 'flat-curb-chain', '/catalog/v2/flat-curb-chain-1.jpg', 0
  UNION ALL SELECT 'flat-curb-chain', '/catalog/v2/flat-curb-chain-2.jpg', 1
  UNION ALL SELECT 'fine-curb-chain', '/catalog/v2/fine-curb-chain-1.jpg', 0
  UNION ALL SELECT 'fine-curb-chain', '/catalog/v2/fine-curb-chain-2.jpg', 1
  UNION ALL SELECT 'bismark-chain', '/catalog/v2/bismark-chain-1.jpg', 0
  UNION ALL SELECT 'bismark-chain', '/catalog/v2/bismark-chain-2.jpg', 1
  UNION ALL SELECT 'emerald-cross', '/catalog/v2/emerald-cross-1.jpg', 0
  UNION ALL SELECT 'emerald-cross', '/catalog/v2/emerald-cross-2.jpg', 1
  UNION ALL SELECT 'emerald-solitaire-pendant', '/catalog/v2/emerald-solitaire-pendant-1.jpg', 0
  UNION ALL SELECT 'emerald-solitaire-pendant', '/catalog/v2/emerald-solitaire-pendant-2.jpg', 1
  UNION ALL SELECT 'emerald-studs', '/catalog/v2/emerald-studs-1.jpg', 0
  UNION ALL SELECT 'emerald-studs', '/catalog/v2/emerald-studs-2.jpg', 1
  UNION ALL SELECT 'emerald-studs', '/catalog/v2/emerald-studs-3.jpg', 2
) v ON v.`slug` = p.`slug`
WHERE NOT EXISTS (
  SELECT 1 FROM (SELECT `product_id`, `url` FROM `product_images`) x
  WHERE x.`product_id` = p.`id` AND x.`url` = v.`url`
);
