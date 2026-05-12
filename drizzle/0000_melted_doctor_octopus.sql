CREATE TABLE `data_team_partners` (
	`id` varchar(36) NOT NULL,
	`seq_number` int AUTO_INCREMENT,
	`display_id` varchar(20),
	`request_id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`tor_file_path` varchar(255),
	`bak_file_path` varchar(255),
	`company_name` varchar(255),
	`status` varchar(50) DEFAULT 'SOURCING',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `data_team_partners_id` PRIMARY KEY(`id`),
	CONSTRAINT `data_team_partners_seq_number_unique` UNIQUE(`seq_number`),
	CONSTRAINT `data_team_partners_display_id_unique` UNIQUE(`display_id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` varchar(50) NOT NULL,
	`is_read` int NOT NULL DEFAULT 0,
	`link` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(36) NOT NULL,
	`email` varchar(150) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `request_for_partners` (
	`id` varchar(36) NOT NULL,
	`seq_number` int AUTO_INCREMENT,
	`display_id` varchar(20),
	`pmo_id` varchar(36) NOT NULL,
	`sow_pekerjaan` text NOT NULL,
	`provinsi` varchar(100) NOT NULL,
	`area` varchar(100) NOT NULL,
	`jumlah_kebutuhan` int NOT NULL,
	`site_id` varchar(100),
	`members_per_team` int NOT NULL DEFAULT 0,
	`status` enum('REQUESTED','SOURCING','ON_TRAINING','TRAINED','COMPLETED') NOT NULL DEFAULT 'REQUESTED',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `request_for_partners_id` PRIMARY KEY(`id`),
	CONSTRAINT `request_for_partners_seq_number_unique` UNIQUE(`seq_number`),
	CONSTRAINT `request_for_partners_display_id_unique` UNIQUE(`display_id`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` varchar(36) NOT NULL,
	`seq_number` int AUTO_INCREMENT,
	`display_id` varchar(20),
	`team_id` varchar(36) NOT NULL,
	`member_number` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`position` varchar(100) NOT NULL,
	`nik` varchar(50) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`ktp_file_path` varchar(255) NOT NULL,
	`selfie_file_path` varchar(255),
	`certificate_file_path` varchar(255),
	`certificate_number` int,
	`alita_ext_email` varchar(150),
	`alita_email_password` varchar(255),
	`is_attended_training` int NOT NULL DEFAULT 0,
	`is_returning` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_members_seq_number_unique` UNIQUE(`seq_number`),
	CONSTRAINT `team_members_display_id_unique` UNIQUE(`display_id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` varchar(36) NOT NULL,
	`seq_number` int AUTO_INCREMENT,
	`display_id` varchar(20),
	`data_team_partner_id` varchar(36) NOT NULL,
	`team_number` int NOT NULL,
	`leader_name` varchar(150),
	`leader_phone` varchar(30),
	`tkpk1_number` varchar(100),
	`tkpk1_file_path` varchar(255),
	`first_aid_number` varchar(100),
	`first_aid_file_path` varchar(255),
	`electrical_number` varchar(100),
	`electrical_file_path` varchar(255),
	`position` varchar(100),
	`location` varchar(150),
	`status` varchar(50) DEFAULT 'SOURCING',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_seq_number_unique` UNIQUE(`seq_number`),
	CONSTRAINT `teams_display_id_unique` UNIQUE(`display_id`)
);
--> statement-breakpoint
CREATE TABLE `training_processes` (
	`id` varchar(36) NOT NULL,
	`seq_number` int AUTO_INCREMENT,
	`display_id` varchar(20),
	`team_id` varchar(36) NOT NULL,
	`qa_id` varchar(36),
	`training_date` timestamp,
	`result` enum('PENDING','LULUS','TIDAK_LULUS') NOT NULL DEFAULT 'PENDING',
	`whatsapp_group_justification` text,
	`evaluation_notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `training_processes_id` PRIMARY KEY(`id`),
	CONSTRAINT `training_processes_seq_number_unique` UNIQUE(`seq_number`),
	CONSTRAINT `training_processes_display_id_unique` UNIQUE(`display_id`),
	CONSTRAINT `training_processes_team_id_unique` UNIQUE(`team_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`seq_number` int AUTO_INCREMENT,
	`display_id` varchar(20),
	`name` varchar(150) NOT NULL,
	`email` varchar(150) NOT NULL,
	`password` varchar(255) NOT NULL,
	`role` enum('SUPERADMIN','PARTNER','PMO_OPS','PROCUREMENT','QA','PEOPLE_CULTURE') NOT NULL DEFAULT 'PARTNER',
	`company_name` varchar(255),
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_seq_number_unique` UNIQUE(`seq_number`),
	CONSTRAINT `users_display_id_unique` UNIQUE(`display_id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `data_team_partners` ADD CONSTRAINT `data_team_partners_request_id_request_for_partners_id_fk` FOREIGN KEY (`request_id`) REFERENCES `request_for_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `data_team_partners` ADD CONSTRAINT `data_team_partners_partner_id_users_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_for_partners` ADD CONSTRAINT `request_for_partners_pmo_id_users_id_fk` FOREIGN KEY (`pmo_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_data_team_partner_id_data_team_partners_id_fk` FOREIGN KEY (`data_team_partner_id`) REFERENCES `data_team_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_processes` ADD CONSTRAINT `training_processes_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_processes` ADD CONSTRAINT `training_processes_qa_id_users_id_fk` FOREIGN KEY (`qa_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;