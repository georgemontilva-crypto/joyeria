-- Lighter look (November 2026): the studio photos were re-rendered on a near-white
-- backdrop and saved under /catalog/v3 and /editorial/v3, same file names as v2.
-- New folder names (rather than overwriting v2) so browsers that cached the old
-- pictures fetch the new ones. This only rewrites those paths; nothing else changes.

UPDATE `product_images` SET `url` = REPLACE(`url`, '/catalog/v2/', '/catalog/v3/') WHERE `url` LIKE '/catalog/v2/%';
--> statement-breakpoint
UPDATE `categories` SET `image` = REPLACE(`image`, '/catalog/v2/', '/catalog/v3/') WHERE `image` LIKE '/catalog/v2/%';
--> statement-breakpoint
UPDATE `collections` SET `image` = REPLACE(`image`, '/catalog/v2/', '/catalog/v3/') WHERE `image` LIKE '/catalog/v2/%';
--> statement-breakpoint
UPDATE `collections` SET `image` = REPLACE(`image`, '/editorial/v2/', '/editorial/v3/') WHERE `image` LIKE '/editorial/v2/%';
--> statement-breakpoint
UPDATE `categories` SET `image` = REPLACE(`image`, '/editorial/v2/', '/editorial/v3/') WHERE `image` LIKE '/editorial/v2/%';
--> statement-breakpoint
-- Past orders keep a snapshot of the photo they were bought with.
UPDATE `order_items` SET `image` = REPLACE(`image`, '/catalog/v2/', '/catalog/v3/') WHERE `image` LIKE '/catalog/v2/%';
