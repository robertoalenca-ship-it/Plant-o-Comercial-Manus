-- Escala Inteligente - Database Setup for HostGator (MySQL)
-- URL: https://plantaomedico.store/

SET FOREIGN_KEY_CHECKS = 0;

-- Users (Auth)
CREATE TABLE IF NOT EXISTS `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`isEmailVerified` boolean DEFAULT false NOT NULL,
	`loginMethod` varchar(64),
	`role` enum('user','admin','coordinator','viewer','staff') NOT NULL DEFAULT 'viewer',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`maxProfiles` int DEFAULT 1 NOT NULL,
	`isPaid` boolean DEFAULT false NOT NULL,
	`stripeCustomerId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`subscriptionStatus` varchar(64),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `local_user_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `local_user_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `local_user_credentials_username_unique` UNIQUE(`username`),
	CONSTRAINT `local_user_credentials_userId_unique` UNIQUE(`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `auth_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`type` enum('email_verification','password_reset') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `auth_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_tokens_token_unique` UNIQUE(`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Multi-tenancy
CREATE TABLE IF NOT EXISTS `schedule_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`active` boolean DEFAULT true NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_profiles_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileId` int NOT NULL,
	`role` enum('owner','admin','viewer') DEFAULT 'viewer' NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	UNIQUE KEY `unique_user_profile` (`userId`,`profileId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Core Business Logic
CREATE TABLE IF NOT EXISTS `doctors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
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
	`specialty` varchar(128),
	`cor` varchar(16) NOT NULL DEFAULT '#3B82F6',
	`observacoes` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`year` int NOT NULL,
	`month` tinyint NOT NULL,
	`status` enum('draft','preliminary','approved','locked') NOT NULL DEFAULT 'draft',
	`generatedAt` timestamp,
	`approvedAt` timestamp,
	`approvedBy` int,
	`balanceScore` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `schedule_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`doctorId` int NOT NULL,
	`entryDate` date NOT NULL,
	`shiftType` enum('manha_sus','manha_convenio','tarde_sus','tarde_convenio','noite','plantao_24h') NOT NULL,
	`isFixed` boolean NOT NULL DEFAULT false,
	`isManualOverride` boolean NOT NULL DEFAULT false,
	`isLocked` boolean NOT NULL DEFAULT false,
	`confirmationStatus` enum('pending','confirmed','adjustment_requested') DEFAULT 'pending' NOT NULL,
	`conflictWarning` text,
	`overrideJustification` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_entries_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fixed_unavailabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`doctorId` int NOT NULL,
	`dayOfWeek` tinyint NOT NULL,
	`shiftType` enum('manha_sus','manha_convenio','tarde_sus','tarde_convenio','noite','all_day') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `fixed_unavailabilities_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `date_unavailabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`doctorId` int NOT NULL,
	`unavailableDate` date NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `date_unavailabilities_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `weekly_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`doctorId` int NOT NULL,
	`dayOfWeek` tinyint NOT NULL,
	`shiftType` enum('manha_sus','manha_convenio','tarde_sus','tarde_convenio','noite') NOT NULL,
	`weekAlternation` enum('all','odd','even') DEFAULT 'all' NOT NULL,
	`participaRodizioNoite` boolean NOT NULL DEFAULT false,
	`noiteFixa` boolean NOT NULL DEFAULT false,
	`priority` int DEFAULT 0 NOT NULL,
	`observacoes` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_rules_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `weekend_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`doctorId` int NOT NULL,
	`dayType` enum('sabado','domingo','ambos') NOT NULL,
	`shiftType` enum('manha_sus','manha_convenio','tarde_sus','tarde_convenio','noite','plantao_24h') NOT NULL,
	`weekOfMonth` tinyint,
	`priority` int DEFAULT 0 NOT NULL,
	`observacoes` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekend_rules_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `monthly_exceptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`doctorId` int NOT NULL,
	`exceptionType` enum('block','force_shift','replace','swap') NOT NULL,
	`recurrenceType` enum('annual','monthly','once','recurring') DEFAULT 'once' NOT NULL,
	`specificDate` date,
	`month` tinyint,
	`dayOfMonth` tinyint,
	`dayOfWeek` tinyint,
	`weekOfMonth` tinyint,
	`shiftType` enum('manha_sus','manha_convenio','tarde_sus','tarde_convenio','noite','plantao_24h','all_day'),
	`replaceDoctorId` int,
	`reason` varchar(512),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthly_exceptions_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `holidays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`holidayDate` date NOT NULL,
	`isNational` boolean DEFAULT true NOT NULL,
	`recurrenceType` enum('annual','once') DEFAULT 'annual' NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `holidays_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`scheduleId` int,
	`userId` int,
	`action` varchar(64) NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`previousValue` json,
	`newValue` json,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `night_rotation_state` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`lastNightDate` date,
	`totalNightsThisMonth` int DEFAULT 0 NOT NULL,
	`rotationPosition` int DEFAULT 0 NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `night_rotation_state_id` PRIMARY KEY(`id`),
	CONSTRAINT `night_rotation_state_doctorId_unique` UNIQUE(`doctorId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
