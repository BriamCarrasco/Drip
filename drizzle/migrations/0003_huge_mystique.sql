CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subscription_id` integer NOT NULL,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`changed_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `is_trial` integer DEFAULT false NOT NULL;