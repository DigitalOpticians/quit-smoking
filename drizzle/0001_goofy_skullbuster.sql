CREATE TABLE `daily_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` text NOT NULL,
	`date` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`confirmed` integer DEFAULT false NOT NULL,
	`baseline` integer NOT NULL,
	`pack_price_cents` integer NOT NULL,
	`pack_size` integer NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_logs_profile_date` ON `daily_logs` (`profile_id`,`date`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`cigarettes_per_day` integer NOT NULL,
	`pack_price_cents` integer NOT NULL,
	`pack_size` integer NOT NULL,
	`time_zone` text NOT NULL,
	`started_on` text NOT NULL
);
