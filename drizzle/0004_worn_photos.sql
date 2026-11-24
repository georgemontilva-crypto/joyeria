-- Photos of the pieces being worn (November 2026) become the collection images.
-- Only rows still holding the previous default are touched; an image chosen in
-- the admin panel is left alone. No-op on an empty database.

UPDATE `collections` SET `image` = '/editorial/v4/emerald-cross.jpg' WHERE `slug` = 'emeralds' AND `image` = '/editorial/v3/emerald-bracelet.jpg';
--> statement-breakpoint
UPDATE `collections` SET `image` = '/editorial/v4/heart-bracelet.jpg' WHERE `slug` = 'mariner-link' AND `image` = '/catalog/v3/mariner-chain-2.jpg';
