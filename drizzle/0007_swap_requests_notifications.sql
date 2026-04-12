CREATE TABLE `swap_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`scheduleId` int NOT NULL,
	`scheduleEntryId` int NOT NULL,
	`requesterUserId` int,
	`requesterDoctorId` int,
	`currentDoctorId` int NOT NULL,
	`targetDoctorId` int,
	`requestType` enum('direct_swap','open_cover') NOT NULL DEFAULT 'direct_swap',
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`reason` varchar(512),
	`decisionNote` varchar(512),
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `swap_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `swap_requests_profile_id_idx` ON `swap_requests` (`profileId`);
--> statement-breakpoint
CREATE INDEX `swap_requests_schedule_id_idx` ON `swap_requests` (`scheduleId`);
--> statement-breakpoint
CREATE INDEX `swap_requests_entry_id_idx` ON `swap_requests` (`scheduleEntryId`);
--> statement-breakpoint
CREATE INDEX `swap_requests_status_idx` ON `swap_requests` (`status`);
--> statement-breakpoint
CREATE TABLE `notification_dispatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`recipientDoctorId` int,
	`recipientUserId` int,
	`channel` enum('email','whatsapp') NOT NULL,
	`templateKey` varchar(64) NOT NULL,
	`destination` varchar(255),
	`payload` json,
	`status` enum('queued','sent','failed','cancelled') NOT NULL DEFAULT 'queued',
	`scheduledFor` timestamp,
	`sentAt` timestamp,
	`failedAt` timestamp,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_dispatches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notification_dispatches_profile_id_idx` ON `notification_dispatches` (`profileId`);
--> statement-breakpoint
CREATE INDEX `notification_dispatches_status_idx` ON `notification_dispatches` (`status`);
--> statement-breakpoint
CREATE INDEX `notification_dispatches_scheduled_for_idx` ON `notification_dispatches` (`scheduledFor`);
