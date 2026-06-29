CREATE TABLE `certificate_sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequence_start` int NOT NULL DEFAULT 314,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certificate_sequences_id` PRIMARY KEY(`id`)
);
