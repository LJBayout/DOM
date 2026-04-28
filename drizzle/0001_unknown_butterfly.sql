CREATE TABLE `fichas_tecnicas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventName` varchar(255) NOT NULL,
	`eventDate` varchar(32) NOT NULL DEFAULT '',
	`location` varchar(255) NOT NULL DEFAULT '',
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`createdByOpenId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fichas_tecnicas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `professionals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fichaId` int NOT NULL,
	`name` varchar(255) NOT NULL DEFAULT '',
	`role` varchar(128) NOT NULL DEFAULT '',
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `professionals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fichaId` int NOT NULL,
	`time` varchar(16) NOT NULL DEFAULT '',
	`activity` varchar(255) NOT NULL DEFAULT '',
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `schedule_items_id` PRIMARY KEY(`id`)
);
