UPDATE `teams` AS `t`
INNER JOIN `team_members` AS `m` ON `m`.`team_id` = `t`.`id`
SET `t`.`leader_name` = 'HADI FATHURROHMAN'
WHERE `m`.`display_id` = 'MBR-00141'
  AND `m`.`name` = 'RADI FATHURROHMAN'
  AND `m`.`position` = 'Leader';
--> statement-breakpoint
UPDATE `team_members`
SET `name` = 'HADI FATHURROHMAN'
WHERE `display_id` = 'MBR-00141'
  AND `name` = 'RADI FATHURROHMAN';
