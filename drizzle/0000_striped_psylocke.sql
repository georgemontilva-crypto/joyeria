CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name_en` varchar(160) NOT NULL,
	`name_es` varchar(160) NOT NULL,
	`description_en` text,
	`description_es` text,
	`image` varchar(500),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name_en` varchar(160) NOT NULL,
	`name_es` varchar(160) NOT NULL,
	`description_en` text,
	`description_es` text,
	`image` varchar(500),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `collections_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(60),
	`subject` varchar(200),
	`message` text NOT NULL,
	`locale` varchar(5) NOT NULL DEFAULT 'en',
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int,
	`name` varchar(200) NOT NULL,
	`sku` varchar(60),
	`image` varchar(500),
	`unit_price_cents` int NOT NULL,
	`quantity` int NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` varchar(24) NOT NULL,
	`token` varchar(64) NOT NULL,
	`status` enum('pending','paid','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`locale` varchar(5) NOT NULL DEFAULT 'en',
	`email` varchar(255),
	`name` varchar(255),
	`phone` varchar(60),
	`shipping_address` json,
	`subtotal_cents` int NOT NULL DEFAULT 0,
	`shipping_cents` int NOT NULL DEFAULT 0,
	`tax_cents` int NOT NULL DEFAULT 0,
	`total_cents` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'usd',
	`stripe_session_id` varchar(255),
	`stripe_payment_intent_id` varchar(255),
	`stock_reserved` boolean NOT NULL DEFAULT false,
	`tracking_carrier` varchar(80),
	`tracking_number` varchar(120),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`paid_at` timestamp,
	`shipped_at` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_number_idx` UNIQUE(`number`),
	CONSTRAINT `orders_token_idx` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`url` varchar(500) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`sku` varchar(60),
	`name_en` varchar(200) NOT NULL,
	`name_es` varchar(200) NOT NULL,
	`description_en` text,
	`description_es` text,
	`details_en` text,
	`details_es` text,
	`price_cents` int,
	`compare_at_cents` int,
	`stock` int NOT NULL DEFAULT 0,
	`category_id` int,
	`collection_id` int,
	`featured` boolean NOT NULL DEFAULT false,
	`is_new` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(80) NOT NULL,
	`value` text NOT NULL,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `orders_session_idx` ON `orders` (`stripe_session_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `product_images_product_idx` ON `product_images` (`product_id`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);