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
