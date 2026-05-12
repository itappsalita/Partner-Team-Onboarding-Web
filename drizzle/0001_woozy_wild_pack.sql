ALTER TABLE `request_for_partners` MODIFY COLUMN `status` enum('REQUESTED','SOURCING','ON_TRAINING','TRAINED','COMPLETED','CANCELED') NOT NULL DEFAULT 'REQUESTED';--> statement-breakpoint
ALTER TABLE `request_for_partners` ADD `deskripsi` text NOT NULL;--> statement-breakpoint
ALTER TABLE `request_for_partners` ADD `due_date` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `team_members` ADD `score` int;