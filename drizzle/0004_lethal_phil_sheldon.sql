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
