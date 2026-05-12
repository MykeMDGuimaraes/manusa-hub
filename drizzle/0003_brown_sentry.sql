CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`keyHash` varchar(256) NOT NULL,
	`keyPrefix` varchar(16) NOT NULL,
	`owner` varchar(64) NOT NULL DEFAULT 'themis',
	`ativa` boolean NOT NULL DEFAULT true,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE TABLE `themis_pautas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(128),
	`titulo` varchar(256) NOT NULL,
	`pilar` varchar(64),
	`icp` varchar(64),
	`faseTeia` varchar(32),
	`ancora` varchar(64),
	`textoAres` text,
	`modoPublicacao` enum('organico','pago','hibrido') DEFAULT 'hibrido',
	`status` enum('recebida','em_campanha','publicada','pausada','rejeitada') NOT NULL DEFAULT 'recebida',
	`metadados` json,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `themis_pautas_id` PRIMARY KEY(`id`),
	CONSTRAINT `themis_pautas_externalId_unique` UNIQUE(`externalId`)
);
