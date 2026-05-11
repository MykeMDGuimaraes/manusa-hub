CREATE TABLE `manusa_acoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipo` enum('A1','A2','A3') NOT NULL,
	`descricao` text NOT NULL,
	`campanha` varchar(256),
	`status` enum('executada','aguardando_ok','pendente_aprovacao','rejeitada') NOT NULL DEFAULT 'executada',
	`metadados` json,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manusa_acoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manusa_params` (
	`id` int AUTO_INCREMENT NOT NULL,
	`icp` enum('saude','mentor','b2b') NOT NULL,
	`cplMeta` decimal(10,2) NOT NULL DEFAULT '15.00',
	`cplTeto` decimal(10,2) NOT NULL DEFAULT '30.00',
	`ctrMinimo` decimal(5,2) NOT NULL DEFAULT '0.50',
	`orcamentoMaxDia` decimal(10,2) NOT NULL DEFAULT '100.00',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manusa_params_id` PRIMARY KEY(`id`),
	CONSTRAINT `manusa_params_icp_unique` UNIQUE(`icp`)
);
--> statement-breakpoint
CREATE TABLE `manusa_rotinas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`nome` varchar(128) NOT NULL,
	`descricao` text,
	`taskId` varchar(128),
	`ativa` boolean NOT NULL DEFAULT true,
	`frequencia` varchar(128),
	`proximaExecucao` timestamp,
	`ultimaExecucao` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manusa_rotinas_id` PRIMARY KEY(`id`),
	CONSTRAINT `manusa_rotinas_slug_unique` UNIQUE(`slug`)
);
