CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int,
	`userId` int,
	`action` varchar(64) NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`previousValue` json,
	`newValue` json,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `date_unavailabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`unavailableDate` date NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `date_unavailabilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`shortName` varchar(64) NOT NULL,
	`category` enum('titular','resident','sesab') NOT NULL DEFAULT 'titular',
	`hasSus` boolean NOT NULL DEFAULT false,
	`hasConvenio` boolean NOT NULL DEFAULT false,
	`canManhaSus` boolean NOT NULL DEFAULT false,
	`canManhaConvenio` boolean NOT NULL DEFAULT false,
	`canTardeSus` boolean NOT NULL DEFAULT false,
	`canTardeConvenio` boolean NOT NULL DEFAULT false,
	`canNoite` boolean NOT NULL DEFAULT false,
	`canFinalDeSemana` boolean NOT NULL DEFAULT false,
	`canSabado` boolean NOT NULL DEFAULT false,
	`canDomingo` boolean NOT NULL DEFAULT false,
	`can24h` boolean NOT NULL DEFAULT false,
	`participaRodizioNoite` boolean NOT NULL DEFAULT false,
	`limiteplantoesmes` int DEFAULT 0,
	`limiteNoitesMes` int DEFAULT 0,
	`limiteFdsMes` int DEFAULT 0,
	`prioridade` enum('baixa','media','alta') NOT NULL DEFAULT 'media',
	`cor` varchar(16) NOT NULL DEFAULT '#3B82F6',
	`observacoes` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixed_unavailabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`dayOfWeek` tinyint NOT NULL,
	`shiftType` enum('manha_sus','manha_convenio','tarde_sus','tarde_convenio','noite','all_day') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fixed_unavailabilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `holidays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`holidayDate` date NOT NULL,
	`isNational` boolean NOT NULL DEFAULT true,
	`recurrenceType` enum('annual','once') NOT NULL DEFAULT 'annual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `holidays_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_exceptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`exceptionType` enum('block','force_shift','replace','swap') NOT NULL,
	`recurrenceType` enum('annual','monthly','once','recurring') NOT NULL DEFAULT 'once',
	`specificDate` date,
	`month` tinyint,
	`dayOfMonth` tinyint,
	`dayOfWeek` tinyint,
	`weekOfMonth` tinyint,
	`shiftType` enum('manha_sus','manha_convenio','tarde_sus','tarde_convenio','noite','plantao_24h','all_day'),
	`replaceDoctorId` int,
	`reason` varchar(512),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthly_exceptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `night_rotation_state` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`lastNightDate` date,
	`totalNightsThisMonth` int NOT NULL DEFAULT 0,
	`rotationPosition` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `night_rotation_state_id` PRIMARY KEY(`id`),
	CONSTRAINT `night_rotation_state_doctorId_unique` UNIQUE(`doctorId`)
);
--> statement-breakpoint
CREATE TABLE `schedule_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`doctorId` int NOT NULL,
	`entryDate` date NOT NULL,
	`shiftType` enum('manha_sus','manha_convenio','tarde_sus','tarde_convenio','noite','plantao_24h') NOT NULL,
	`isFixed` boolean NOT NULL DEFAULT false,
	`isManualOverride` boolean NOT NULL DEFAULT false,
	`isLocked` boolean NOT NULL DEFAULT false,
	`conflictWarning` text,
	`overrideJustification` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`month` tinyint NOT NULL,
	`status` enum('draft','preliminary','approved','locked') NOT NULL DEFAULT 'draft',
	`generatedAt` timestamp,
	`approvedAt` timestamp,
	`approvedBy` int,
	`balanceScore` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekend_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`dayType` enum('sabado','domingo','ambos') NOT NULL,
	`shiftType` enum('manha_sus','manha_convenio','tarde_sus','tarde_convenio','noite','plantao_24h') NOT NULL,
	`weekOfMonth` tinyint,
	`priority` int NOT NULL DEFAULT 0,
	`observacoes` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekend_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`dayOfWeek` tinyint NOT NULL,
	`shiftType` enum('manha_sus','manha_convenio','tarde_sus','tarde_convenio','noite') NOT NULL,
	`weekAlternation` enum('all','odd','even') NOT NULL DEFAULT 'all',
	`participaRodizioNoite` boolean NOT NULL DEFAULT false,
	`noiteFixa` boolean NOT NULL DEFAULT false,
	`priority` int NOT NULL DEFAULT 0,
	`observacoes` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','coordinator','viewer') NOT NULL DEFAULT 'viewer';