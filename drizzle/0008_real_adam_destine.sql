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
CREATE TABLE `presence_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`doctorId` int NOT NULL,
	`scheduleEntryId` int,
	`checkInTime` timestamp,
	`checkOutTime` timestamp,
	`latitude` varchar(32),
	`longitude` varchar(32),
	`locationName` varchar(255),
	`photoUrl` text,
	`status` enum('valid','invalid','pending','manual_adjustment') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `presence_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
ALTER TABLE `doctors` ADD `crmNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `doctors` ADD `crmState` varchar(2);--> statement-breakpoint
ALTER TABLE `doctors` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `doctors` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `doctors` ADD `shiftRate` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `doctors` ADD `nightBonus` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `doctors` ADD `weekendBonus` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fixed_unavailabilities` ADD `userId` int;--> statement-breakpoint
CREATE INDEX `notification_dispatches_profile_id_idx` ON `notification_dispatches` (`profileId`);--> statement-breakpoint
CREATE INDEX `notification_dispatches_status_idx` ON `notification_dispatches` (`status`);--> statement-breakpoint
CREATE INDEX `notification_dispatches_scheduled_for_idx` ON `notification_dispatches` (`scheduledFor`);--> statement-breakpoint
CREATE INDEX `presence_logs_profile_id_idx` ON `presence_logs` (`profileId`);--> statement-breakpoint
CREATE INDEX `presence_logs_doctor_id_idx` ON `presence_logs` (`doctorId`);--> statement-breakpoint
CREATE INDEX `presence_logs_status_idx` ON `presence_logs` (`status`);--> statement-breakpoint
CREATE INDEX `swap_requests_profile_id_idx` ON `swap_requests` (`profileId`);--> statement-breakpoint
CREATE INDEX `swap_requests_schedule_id_idx` ON `swap_requests` (`scheduleId`);--> statement-breakpoint
CREATE INDEX `swap_requests_entry_id_idx` ON `swap_requests` (`scheduleEntryId`);--> statement-breakpoint
CREATE INDEX `swap_requests_status_idx` ON `swap_requests` (`status`);