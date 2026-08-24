CREATE TABLE `logo_cache` (
	`url_hash` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`content_type` text NOT NULL,
	`data` blob NOT NULL,
	`fetched_at` text NOT NULL
);
