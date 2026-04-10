CREATE TABLE `schedule_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `schedule_profiles` (`name`, `description`, `active`)
VALUES ('Equipe Padrão', 'Perfil base do sistema', true);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `profileId` int NULL;
--> statement-breakpoint
ALTER TABLE `date_unavailabilities` ADD `profileId` int NULL;
--> statement-breakpoint
ALTER TABLE `doctors` ADD `profileId` int NULL;
--> statement-breakpoint
ALTER TABLE `fixed_unavailabilities` ADD `profileId` int NULL;
--> statement-breakpoint
ALTER TABLE `monthly_exceptions` ADD `profileId` int NULL;
--> statement-breakpoint
ALTER TABLE `schedules` ADD `profileId` int NULL;
--> statement-breakpoint
ALTER TABLE `weekend_rules` ADD `profileId` int NULL;
--> statement-breakpoint
ALTER TABLE `weekly_rules` ADD `profileId` int NULL;
--> statement-breakpoint
UPDATE `doctors`
SET `profileId` = 1
WHERE `profileId` IS NULL;
--> statement-breakpoint
UPDATE `fixed_unavailabilities` fu
INNER JOIN `doctors` d ON d.`id` = fu.`doctorId`
SET fu.`profileId` = COALESCE(d.`profileId`, 1)
WHERE fu.`profileId` IS NULL;
--> statement-breakpoint
UPDATE `date_unavailabilities` du
INNER JOIN `doctors` d ON d.`id` = du.`doctorId`
SET du.`profileId` = COALESCE(d.`profileId`, 1)
WHERE du.`profileId` IS NULL;
--> statement-breakpoint
UPDATE `weekly_rules` wr
INNER JOIN `doctors` d ON d.`id` = wr.`doctorId`
SET wr.`profileId` = COALESCE(d.`profileId`, 1)
WHERE wr.`profileId` IS NULL;
--> statement-breakpoint
UPDATE `weekend_rules` wr
INNER JOIN `doctors` d ON d.`id` = wr.`doctorId`
SET wr.`profileId` = COALESCE(d.`profileId`, 1)
WHERE wr.`profileId` IS NULL;
--> statement-breakpoint
UPDATE `monthly_exceptions` me
INNER JOIN `doctors` d ON d.`id` = me.`doctorId`
SET me.`profileId` = COALESCE(d.`profileId`, 1)
WHERE me.`profileId` IS NULL;
--> statement-breakpoint
UPDATE `schedules`
SET `profileId` = 1
WHERE `profileId` IS NULL;
--> statement-breakpoint
UPDATE `audit_logs` al
LEFT JOIN `schedules` s ON s.`id` = al.`scheduleId`
SET al.`profileId` = COALESCE(s.`profileId`, 1)
WHERE al.`profileId` IS NULL;
--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `profileId` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `date_unavailabilities` MODIFY COLUMN `profileId` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `doctors` MODIFY COLUMN `profileId` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `fixed_unavailabilities` MODIFY COLUMN `profileId` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `monthly_exceptions` MODIFY COLUMN `profileId` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `schedules` MODIFY COLUMN `profileId` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `weekend_rules` MODIFY COLUMN `profileId` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `weekly_rules` MODIFY COLUMN `profileId` int NOT NULL;
