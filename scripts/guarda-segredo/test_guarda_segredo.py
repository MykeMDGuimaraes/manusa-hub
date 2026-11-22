#!/usr/bin/env python3
"""Teste do ataque: commit com segredo falso tem de reprovar o guarda de segredo do CI.

Simula o agente que commita na nuvem, direto na main e sem hook nenhum, gravando token da Meta
dentro de .manus/db/*.json e chave do Freepik em .md. Sem o guarda, os dois passam; com ele, o
CI reprova. Os valores são falsos e montados na hora (nenhum literal no código), e cada
teste confere que nem um pedaço de 9 caracteres deles aparece na saída.

Cada caso monta um repositório descartável numa pasta temporária, com HOME vazio e com a
configuração global e a de sistema do git desligadas (sem hook nenhum, como chega o commit da
nuvem), e roda o ci.py com um evento do Actions de mentira.

    python3 -I scripts/guarda-segredo/test_guarda_segredo.py
"""
import importlib.util
import json
import os
import secrets
import string
import subprocess
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path

AQUI = Path(__file__).resolve().parent
CI = AQUI / "ci.py"

_spec = importlib.util.spec_from_file_location("guarda_ci", CI)
ci = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ci)

ALFANUM = string.ascii_letters + string.digits
ZERO = "0" * 40


def token_meta_falso(tamanho=232):
    """Formato do token da Graph API: 'EAA' seguido de alfanuméricos. Montado em pedaços: sem literal no código."""
    return "EA" + "A" + "".join(secrets.choice(ALFANUM) for _ in range(tamanho - 3))


def chave_freepik_falsa():
    return "FP" + "SX" + secrets.token_hex(16)


def vazou(valor, saida):
    """Algum pedaço de 9 ou mais caracteres do valor está na saída? (a casa cita segredo por até 8)"""
    return any(valor[i:i + 9] in saida for i in range(len(valor) - 8))


def push(antes, depois, ref="refs/heads/main"):
    return {"ref": ref, "before": antes, "after": depois, "pusher": {"name": "agente-na-nuvem"},
            "repository": {"default_branch": "main", "full_name": "dono/repo", "owner": {"login": "dono"}}}


def pull_request(base, cabeca):
    return {"pull_request": {"base": {"sha": base, "ref": "main"}, "head": {"sha": cabeca, "ref": "agente/x"}},
            "repository": {"default_branch": "main", "full_name": "dono/repo", "owner": {"login": "dono"}}}


class Repositorio:
    """Repositório descartável, sem hooks e sem configuração global: como chega o commit da nuvem."""

    def __init__(self, pasta):
        self.raiz, casa, self.evento = pasta / "repo", pasta / "casa", pasta / "evento.json"
        self.raiz.mkdir()
        casa.mkdir()
        self.env = {k: v for k, v in os.environ.items() if not k.startswith(("GIT_", "GITHUB_", "GH_"))}
        self.env.update(HOME=str(casa), USERPROFILE=str(casa), GIT_CONFIG_NOSYSTEM="1",
                        GIT_CONFIG_GLOBAL=str(casa / "sem-config-global"),
                        GIT_AUTHOR_NAME="agente-na-nuvem", GIT_AUTHOR_EMAIL="agente@exemplo.invalid",
                        GIT_COMMITTER_NAME="agente-na-nuvem", GIT_COMMITTER_EMAIL="agente@exemplo.invalid")
        self.git("init", "-q", "-b", "main")

    def git(self, *args):
        r = subprocess.run(["git", *args], cwd=self.raiz, env=self.env, capture_output=True, text=True,
                           encoding="utf-8", errors="replace")
        if r.returncode != 0:
            raise AssertionError(f"git {args[0]} saiu com {r.returncode}")
        return r.stdout.strip()

    def commit(self, arquivos):
        """arquivos: {caminho: conteúdo}; conteúdo None tira o arquivo do git."""
        for caminho, conteudo in arquivos.items():
            if conteudo is None:
                self.git("rm", "-q", caminho)
                continue
            alvo = self.raiz / caminho
            alvo.parent.mkdir(parents=True, exist_ok=True)
            alvo.write_text(conteudo, encoding="utf-8", newline="\n")
            self.git("add", caminho)
        self.git("commit", "-q", "-m", "agente: " + ", ".join(arquivos))
        return self.git("rev-parse", "HEAD")

    def guarda(self, evento, dados):
        self.evento.write_text(json.dumps(dados), encoding="utf-8")
        env = dict(self.env, GITHUB_EVENT_NAME=evento, GITHUB_EVENT_PATH=str(self.evento))
        r = subprocess.run([sys.executable, "-I", str(CI)], cwd=self.raiz, env=env, capture_output=True,
                           text=True, encoding="utf-8", errors="replace", timeout=120)
        return r.returncode, r.stdout + r.stderr


class AtaqueTest(unittest.TestCase):
    def setUp(self):
        pasta = tempfile.TemporaryDirectory()
        self.addCleanup(pasta.cleanup)
        self.repo = Repositorio(Path(pasta.name))
        self.base = self.repo.commit({"README.md": "# projeto\n"})

    def assertReprova(self, codigo, saida, valor, achado):
        self.assertFalse(vazou(valor, saida), "um pedaço do valor falso apareceu na saída do guarda")
        self.assertEqual(codigo, 1, "o guarda tinha de reprovar")
        self.assertTrue(achado in saida, f"faltou o achado: {achado}")

    def test_token_da_meta_em_dump_do_manus_reprova_o_push(self):
        token = token_meta_falso(292)
        consulta = f"INSERT INTO manusaParams (chave, valor) VALUES ('meta_token', '{token}')"
        depois = self.repo.commit({".manus/db/db-query-1.json": json.dumps({"query": consulta}) + "\n"})
        codigo, saida = self.repo.guarda("push", push(self.base, depois))
        self.assertReprova(codigo, saida, token, f"{depois[:8]} .manus/db/db-query-1.json:1  [token da Meta]")

    def test_chave_do_freepik_em_markdown_reprova_o_push(self):
        chave = chave_freepik_falsa()
        depois = self.repo.commit({"CONTINUIDADE.md": f"# Próxima sessão\n\n- `FREEPIK_API_KEY` — `{chave}` ✅\n"})
        codigo, saida = self.repo.guarda("push", push(self.base, depois))
        self.assertReprova(codigo, saida, chave, f"{depois[:8]} CONTINUIDADE.md:3  [chave Freepik]")

    def test_dump_do_manus_sem_token_reprova(self):
        depois = self.repo.commit({".manus/db/db-query-2.json": json.dumps({"query": "select 1"}) + "\n"})
        codigo, saida = self.repo.guarda("push", push(self.base, depois))
        self.assertEqual(codigo, 1)
        self.assertTrue(f"{depois[:8]} .manus/db/db-query-2.json  [dump de sessão de agente" in saida,
                        "faltou o achado do dump .manus/")

    def test_commit_limpo_passa(self):
        depois = self.repo.commit({"server/freepik.ts": "export const chave = process.env.FREEPIK_API_KEY;\n"})
        codigo, saida = self.repo.guarda("push", push(self.base, depois))
        self.assertEqual(codigo, 0)
        self.assertTrue("limpo, 1 commit(s) varrido(s)" in saida, "faltou a linha de limpo")

    def test_tirar_o_segredo_e_o_dump_passa(self):
        chave = chave_freepik_falsa()
        com = self.repo.commit({"NOTAS.md": f"chave: {chave}\n", ".manus/db/q.json": "{}\n"})
        sem = self.repo.commit({"NOTAS.md": "chave: ver FREEPIK_API_KEY no ambiente\n", ".manus/db/q.json": None})
        codigo, saida = self.repo.guarda("push", push(com, sem))
        self.assertFalse(vazou(chave, saida), "um pedaço da chave falsa apareceu na saída do guarda")
        self.assertEqual(codigo, 0)

    def test_vazamento_antigo_nao_reprova_o_push_seguinte(self):
        velho = self.repo.commit({"NOTAS.md": f"chave: {chave_freepik_falsa()}\n"})
        novo = self.repo.commit({"src/app.ts": "export {};\n"})
        codigo, _ = self.repo.guarda("push", push(velho, novo))
        self.assertEqual(codigo, 0)

    def test_pull_request_varre_so_os_commits_do_pr(self):
        velho = self.repo.commit({"NOTAS.md": f"chave: {chave_freepik_falsa()}\n"})  # vazamento antigo na main
        self.repo.git("switch", "-q", "-c", "agente/x")
        limpo = self.repo.commit({"src/app.ts": "export {};\n"})
        codigo, _ = self.repo.guarda("pull_request", pull_request(velho, limpo))
        self.assertEqual(codigo, 0, "commit limpo no PR não pode reprovar por vazamento antigo da main")
        token = token_meta_falso()
        sujo = self.repo.commit({".manus/db/q.json": json.dumps({"t": token}) + "\n"})
        codigo, saida = self.repo.guarda("pull_request", pull_request(velho, sujo))
        self.assertReprova(codigo, saida, token, f"{sujo[:8]} .manus/db/q.json:1  [token da Meta]")

    def test_branch_nova_varre_o_que_nao_esta_na_padrao(self):
        velho = self.repo.commit({"NOTAS.md": f"chave: {chave_freepik_falsa()}\n"})
        self.repo.git("update-ref", "refs/remotes/origin/main", velho)
        self.repo.git("switch", "-q", "-c", "agente/nova")
        limpo = self.repo.commit({"src/app.ts": "export {};\n"})
        codigo, _ = self.repo.guarda("push", push(ZERO, limpo, "refs/heads/agente/nova"))
        self.assertEqual(codigo, 0, "branch nova limpa não pode reprovar por vazamento antigo da main")
        chave = chave_freepik_falsa()
        sujo = self.repo.commit({"LEIA.md": f"{chave}\n"})
        codigo, saida = self.repo.guarda("push", push(ZERO, sujo, "refs/heads/agente/nova"))
        self.assertReprova(codigo, saida, chave, f"{sujo[:8]} LEIA.md:1  [chave Freepik]")

    def test_branch_apagada_nao_varre(self):
        codigo, saida = self.repo.guarda("push", push(self.base, ZERO, "refs/heads/agente/velha"))
        self.assertEqual(codigo, 0)
        self.assertTrue("nada a varrer" in saida, "faltou a linha de branch apagada")


class FaixaTest(unittest.TestCase):
    A, B = "a" * 40, "b" * 40

    def test_push_comum(self):
        self.assertEqual(ci.faixa("push", push(self.A, self.B), lambda ref: True), [self.B, f"^{self.A}"])

    def test_branch_apagada(self):
        self.assertEqual(ci.faixa("push", push(self.A, ZERO), lambda ref: True), [])

    def test_branch_nova(self):
        self.assertEqual(ci.faixa("push", push(ZERO, self.B, "refs/heads/agente/x"), lambda ref: True),
                         [self.B, "^origin/main"])

    def test_primeira_subida_da_padrao_varre_tudo(self):
        self.assertEqual(ci.faixa("push", push(ZERO, self.B), lambda ref: True), [self.B])

    def test_force_push_com_o_antes_sumido(self):
        sem_o_antes = lambda ref: ref != self.A  # noqa: E731
        self.assertEqual(ci.faixa("push", push(self.A, self.B, "refs/heads/agente/x"), sem_o_antes),
                         [self.B, "^origin/main"])
        self.assertEqual(ci.faixa("push", push(self.A, self.B), sem_o_antes), [self.B])

    def test_pull_request(self):
        self.assertEqual(ci.faixa("pull_request", pull_request(self.A, self.B), lambda ref: True),
                         [self.B, f"^{self.A}"])
        self.assertEqual(ci.faixa("pull_request", pull_request(self.A, self.B), lambda ref: ref != self.A),
                         [self.B, "^origin/main"])

    def test_evento_sem_faixa(self):
        with self.assertRaises(ValueError):
            ci.faixa("schedule", {}, lambda ref: True)


class Resposta:
    def __init__(self, dados):
        self.dados = dados

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self):
        return json.dumps(self.dados).encode("utf-8")


class AvisoTest(unittest.TestCase):
    ACHADOS = ["  abcdef12 .manus/db/q.json:1  [token da Meta]"]
    ENV = {"GH_TOKEN": "token-de-teste", "GITHUB_REPOSITORY": "dono/repo", "GITHUB_REPOSITORY_OWNER": "dono",
           "GITHUB_RUN_ID": "42"}

    def abrir_falso(self, abertas):
        self.pedidos = []

        def abrir(req, timeout=None):
            corpo = json.loads(req.data.decode("utf-8")) if req.data else None
            self.pedidos.append((req.get_method(), req.full_url, corpo, req.get_header("Authorization")))
            return Resposta(abertas if req.get_method() == "GET" else {"number": 7})
        return abrir

    def test_abre_issue_para_o_dono(self):
        msg = ci.avisar(push("a" * 40, "b" * 40), self.ACHADOS, self.ENV, abrir=self.abrir_falso([]))
        metodo, url, corpo, autorizacao = self.pedidos[-1]
        self.assertEqual((metodo, url), ("POST", "https://api.github.com/repos/dono/repo/issues"))
        self.assertEqual(corpo["assignees"], ["dono"])
        self.assertTrue(corpo["title"].startswith("[guarda-segredo]"))
        self.assertIn("abcdef12 .manus/db/q.json:1  [token da Meta]", corpo["body"])
        self.assertIn("/dono/repo/actions/runs/42", corpo["body"])
        self.assertEqual(autorizacao, "Bearer token-de-teste")
        self.assertIn("#7", msg)

    def test_comenta_na_issue_que_ja_esta_aberta(self):
        abertas = [{"number": 4, "title": "[guarda-segredo] num PR", "pull_request": {}},
                   {"number": 3, "title": "[guarda-segredo] achado no push em main (aaaaaaaa)"}]
        msg = ci.avisar(push("a" * 40, "b" * 40), self.ACHADOS, self.ENV, abrir=self.abrir_falso(abertas))
        metodo, url, _, _ = self.pedidos[-1]
        self.assertEqual((metodo, url), ("POST", "https://api.github.com/repos/dono/repo/issues/3/comments"))
        self.assertIn("#3", msg)

    def test_sem_token_diz_que_nao_avisou(self):
        msg = ci.avisar(push("a" * 40, "b" * 40), self.ACHADOS, {"GITHUB_REPOSITORY": "dono/repo"},
                        abrir=self.abrir_falso([]))
        self.assertEqual(self.pedidos, [])
        self.assertIn("sem GH_TOKEN", msg)

    def test_falha_da_api_aparece(self):
        def abrir(req, timeout=None):
            raise urllib.error.URLError("sem rede")
        msg = ci.avisar(push("a" * 40, "b" * 40), self.ACHADOS, self.ENV, abrir=abrir)
        self.assertIn("não consegui abrir a issue de alerta", msg)


if __name__ == "__main__":
    for fluxo in (sys.stdout, sys.stderr):
        try:
            fluxo.reconfigure(encoding="utf-8")
        except AttributeError:
            pass
    unittest.main(verbosity=2)
