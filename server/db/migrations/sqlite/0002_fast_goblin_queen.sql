CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item` text NOT NULL,
	`amount` integer NOT NULL,
	`spentAt` integer NOT NULL
);
