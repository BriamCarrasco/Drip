CREATE TABLE `exchange_rates` (
	`pair` text PRIMARY KEY NOT NULL,
	`rate` real NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `settings` ADD `exchange_rate_mode` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `manual_exchange_rate` real;