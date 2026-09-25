CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`company` varchar(180),
	`service` varchar(120) NOT NULL,
	`bookingDate` varchar(20) NOT NULL,
	`bookingTime` varchar(20) NOT NULL,
	`notes` text,
	`status` enum('requested','confirmed','completed','cancelled') NOT NULL DEFAULT 'requested',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contact_submissions` MODIFY COLUMN `status` enum('new','reviewed','in_progress','won','archived') NOT NULL DEFAULT 'new';--> statement-breakpoint
ALTER TABLE `contact_submissions` ADD `adminNotes` text;