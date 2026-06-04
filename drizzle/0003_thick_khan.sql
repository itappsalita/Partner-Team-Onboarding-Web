CREATE TABLE `project_ids` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` varchar(100) NOT NULL,
	`project_name` varchar(255) NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_ids_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_ids_project_id_unique` UNIQUE(`project_id`)
);
