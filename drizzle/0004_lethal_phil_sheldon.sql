CREATE TABLE `local_user_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `local_user_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `local_user_credentials_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `local_user_credentials_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileId` int NOT NULL,
	`role` enum('owner','admin','viewer') NOT NULL DEFAULT 'viewer',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_user_profile` UNIQUE(`userId`,`profileId`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `user_profiles` (`userId`);--> statement-breakpoint
CREATE INDEX `profileId_idx` ON `user_profiles` (`profileId`);