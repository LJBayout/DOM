CREATE TABLE `hotels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fichaId` int NOT NULL,
	`name` varchar(255) NOT NULL DEFAULT '',
	`address` text NOT NULL DEFAULT (''),
	`contact` varchar(255) NOT NULL DEFAULT '',
	`contactPerson` varchar(255) NOT NULL DEFAULT '',
	`localContact` varchar(255) NOT NULL DEFAULT '',
	`gpsLink` text NOT NULL DEFAULT (''),
	`roomListPdfs` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `hotels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `logistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fichaId` int NOT NULL,
	`role` varchar(128) NOT NULL DEFAULT '',
	`name` varchar(255) NOT NULL DEFAULT '',
	`contact` varchar(255) NOT NULL DEFAULT '',
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `logistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `attraction` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `attractionPdfs` text;--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `stateCity` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `address` text DEFAULT ('') NOT NULL;--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `localProducerName` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `localProducerContact` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `hotelName` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `hotelAddress` text DEFAULT ('') NOT NULL;--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `hotelContact` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `hotelContactPerson` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `hotelLocalContact` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `hotelGpsLink` text DEFAULT ('') NOT NULL;--> statement-breakpoint
ALTER TABLE `fichas_tecnicas` ADD `hotelRoomListPdfs` text;--> statement-breakpoint
ALTER TABLE `professionals` ADD `contact` varchar(255) DEFAULT '' NOT NULL;