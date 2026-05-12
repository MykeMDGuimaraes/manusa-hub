CREATE TABLE `olimpo_operadores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(32) NOT NULL,
	`nome` varchar(64) NOT NULL,
	`papel` varchar(128) NOT NULL,
	`cerebro` varchar(128),
	`camada` varchar(64),
	`status` enum('online','offline','degradado','desconhecido') NOT NULL DEFAULT 'desconhecido',
	`ultimaAtividade` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `olimpo_operadores_id` PRIMARY KEY(`id`),
	CONSTRAINT `olimpo_operadores_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `olimpo_workflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowId` varchar(64) NOT NULL,
	`nome` varchar(128) NOT NULL,
	`descricao` text,
	`cadencia` varchar(128),
	`operador` enum('themis','ares','manusa','jhon','sistema') NOT NULL DEFAULT 'sistema',
	`ativo` boolean NOT NULL DEFAULT true,
	`ultimaExecucao` timestamp,
	`ultimoStatus` enum('ok','erro','pendente','desconhecido') NOT NULL DEFAULT 'desconhecido',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `olimpo_workflows_id` PRIMARY KEY(`id`),
	CONSTRAINT `olimpo_workflows_workflowId_unique` UNIQUE(`workflowId`)
);
