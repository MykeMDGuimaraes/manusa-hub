#!/usr/bin/env python3
"""Varredura de segredos da casa (Dia Solutions).

Procura segredo em linhas ADICIONADAS (commit/push) ou em todo o histórico
(auditoria). Nunca imprime o valor: só arquivo, linha e qual regra casou.

Por que prefixo e não só padrão: em 24/09/2026 uma varredura por tamanho
(16+ chars) deixou passar um segredo de 15 chars, que foi publicado no GitHub.
Os segredos reais desta casa são curtos e sem cara de segredo. A lista de
prefixos reais mora FORA do git, em ~/.config/dia-casa/prefixos-segredo.txt
(um por linha, '#' comenta). Padrão genérico é complemento, não substituto.

Agente que commita na nuvem (o Manus) não passa por estes hooks. Por isso as
regras da Meta, do Freepik e do dump .manus/ (22/11/2026) e a cópia deste
arquivo no CI dos repositórios em que ele commita (scripts/guarda-segredo).

Uso:
  casa-segredos.py --staged              linhas adicionadas no index
  casa-segredos.py --range <rev-list>    linhas adicionadas nos commits (args do git rev-list)
  casa-segredos.py --historico           todo o histórico (auditoria, lento)
Sai com 1 se achar algo, 0 se limpo, 2 se não conseguiu varrer.
"""
import base64
import json
import os
import re
import subprocess
import sys

LISTA_PREFIXOS = os.path.join(os.path.expanduser("~"), ".config", "dia-casa", "prefixos-segredo.txt")

PADROES = [
    ("chave OpenAI", re.compile(r"sk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{40,}")),
    ("chave Anthropic", re.compile(r"sk-ant-(?:api|admin)\d{2}-[A-Za-z0-9_-]{80,}")),  # real ~108 chars; placeholder de .env.example não casa
    ("chave secreta Supabase", re.compile(r"sb_secret_[A-Za-z0-9_-]{8,}")),
    ("token GitHub", re.compile(r"\b(?:ghp|gho|ghs|ghu)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}")),
    ("chave AWS", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("token Slack", re.compile(r"\bxox[abpr]-[A-Za-z0-9-]{10,}")),
    ("chave Google", re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b")),
    ("chave privada", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    # Token da Graph API: 'EAA' + alfanuméricos, o real tem 200+ (citação pelo prefixo não casa). Antes dele vale
    # qualquer separador, '_' inclusive, e também escape de JSON (\n, \t, \r) e '=' de URL codificado (%3D);
    # dentro de base64 ('+', '/' ou alfanumérico antes) não vale.
    ("token da Meta", re.compile(r"(?:(?<![A-Za-z0-9+/])|(?<=\\[nrt])|(?<=%3[Dd]))EAA[A-Za-z0-9]{100,}")),
    ("chave Freepik", re.compile(r"\bFPSX[0-9a-fA-F]{32}")),
]
# Dump de sessão do agente Manus: grava as consultas ao banco com os valores (token, senha).
# Vale pelo nome do arquivo, então binário, vazio e renomeado também contam.
DUMP_AGENTE = re.compile(r"(?:^|/)\.manus/")
TOCADOS = ("--name-only", "-z", "--diff-filter=ACMRT")  # arquivo que entrou ou mudou; o apagado não conta
# Nome de variável que sai inteiro na saída. O que vem antes do '=' pode ser o próprio valor (linha só com o
# segredo e o '=' do padding): fora deste formato, sai com no máximo 8 caracteres, como a casa cita segredo.
NOME_DE_VARIAVEL = re.compile(r"^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$")
PEM_INLINE = re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----(.*?)-----END [A-Z ]*PRIVATE KEY-----")
JWT = re.compile(r"eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}")
ENV_PUBLICO = re.compile(r"^(?:VITE_|NEXT_PUBLIC_|PUBLIC_|EXPO_PUBLIC_|REACT_APP_)")
ARQUIVO_ENV = re.compile(r"(?:^|/)\.env(?:\.[^/]*)?$")
ENV_EXEMPLO = re.compile(r"\.(?:example|sample|template)$")


def git(*args):
    r = subprocess.run(["git", *args], capture_output=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr.decode("utf-8", "replace"))
        sys.exit(2)
    return r.stdout.decode("utf-8", "replace")


def prefixos_reais():
    try:
        with open(LISTA_PREFIXOS, encoding="utf-8") as f:
            return [l.strip() for l in f if l.strip() and not l.lstrip().startswith("#")]
    except FileNotFoundError:
        return None


def jwt_privilegiado(payload_b64):
    try:
        dados = json.loads(base64.urlsafe_b64decode(payload_b64 + "=" * (-len(payload_b64) % 4)))
    except Exception:
        return False
    papel = str(dados.get("role", ""))
    return papel not in ("anon", "authenticated", "")


def linhas_adicionadas(diff):
    """Gera (arquivo, número da linha, conteúdo) das linhas '+' de um diff -U0."""
    arquivo, n = None, 0
    for linha in diff.splitlines():
        if linha.startswith("+++ "):
            alvo = linha[4:]
            arquivo = None if alvo == "/dev/null" else re.sub(r"^b/", "", alvo)
        elif linha.startswith("@@"):
            m = re.search(r"\+(\d+)", linha)
            n = int(m.group(1)) if m else 0
        elif linha.startswith("+") and arquivo:
            yield arquivo, n, linha[1:]
            n += 1


def nome_na_saida(chave):
    if NOME_DE_VARIAVEL.match(chave) and len(chave) <= 64:
        return chave
    return chave[:8] + ("…" if len(chave) > 8 else "")


def nomes(saida_z):
    """Nomes de arquivo de uma saída '--name-only -z' do git."""
    return [n.strip("\n") for n in saida_z.split("\0") if n.strip("\n")]


def dumps_de_agente(arquivos, onde=""):
    return [f"  {onde}{a}  [dump de sessão de agente (.manus/) versionado: tire do git e ponha no .gitignore]"
            for a in arquivos if DUMP_AGENTE.search(a)]


def varrer(fonte, prefixos, onde=""):
    achados = []
    for arquivo, n, texto in fonte:
        regras = [nome for nome, rx in PADROES if rx.search(texto)]
        # PEM que abre e fecha na mesma linha com corpo curto é fixture de teste
        # (dia_flow/sefin_test.ts: corpo "fake"). Chave real inline tem centenas de chars.
        m = PEM_INLINE.search(texto)
        if "chave privada" in regras and m and len(m.group(1)) < 40:
            regras.remove("chave privada")
        # Prefixo SEGUIDO de mais 4+ caracteres de token = valor real. Documento
        # que cita o segredo pelo prefixo ("b1f852bd…", regra da casa) não casa.
        regras += [f"prefixo real {p[:4]}…" for p in prefixos
                   if re.search(re.escape(p) + r"[A-Za-z0-9_.+/=-]{4,}", texto)]
        for m in JWT.finditer(texto):
            if jwt_privilegiado(m.group(1)):
                regras.append("JWT com papel privilegiado (service_role ou similar)")
        if ARQUIVO_ENV.search(arquivo) and not ENV_EXEMPLO.search(arquivo):
            chave = texto.split("=", 1)[0].strip().removeprefix("export ").strip()
            if "=" in texto and chave and not chave.startswith("#") and not ENV_PUBLICO.match(chave):
                regras.append(f"variável não pública '{nome_na_saida(chave)}' em arquivo .env versionado")
        for r in regras:
            achados.append(f"  {onde}{arquivo}:{n}  [{r}]")
    return achados


def main():
    for fluxo in (sys.stdout, sys.stderr):
        try:
            fluxo.reconfigure(encoding="utf-8")  # console do Windows fala cp1252
        except AttributeError:
            pass
    modo =sys.argv[1] if len(sys.argv) > 1 else "--staged"
    prefixos = prefixos_reais()
    if prefixos is None:
        sys.stderr.write(
            f"casa-segredos: lista de prefixos reais ausente ({LISTA_PREFIXOS}).\n"
            "Rode o instalar.sh do dia-casa. Sem a lista, só os padrões genéricos rodam.\n"
        )
        prefixos = []

    achados = []
    if modo == "--staged":
        achados = varrer(linhas_adicionadas(git("diff", "--cached", "-U0", "--no-color", "--no-ext-diff")), prefixos)
        achados += dumps_de_agente(nomes(git("diff", "--cached", *TOCADOS)))
    elif modo == "--range":
        for sha in git("rev-list", *sys.argv[2:]).split():
            d = git("show", "-U0", "--no-color", "--no-ext-diff", "--format=", sha)
            achados += varrer(linhas_adicionadas(d), prefixos, onde=f"{sha[:8]} ")
            achados += dumps_de_agente(nomes(git("show", "--format=", *TOCADOS, sha)), onde=f"{sha[:8]} ")
    elif modo == "--historico":
        for sha in git("rev-list", "--all").split():
            d = git("show", "-U0", "--no-color", "--no-ext-diff", "--format=", sha)
            achados += varrer(linhas_adicionadas(d), prefixos, onde=f"{sha[:8]} ")
            achados += dumps_de_agente(nomes(git("show", "--format=", *TOCADOS, sha)), onde=f"{sha[:8]} ")
    else:
        sys.stderr.write(__doc__)
        return 2

    if achados:
        sys.stderr.write("\n✋ SEGREDO — a casa não versiona segredo (valor omitido de propósito):\n")
        sys.stderr.write("\n".join(sorted(set(achados))) + "\n\n")
        sys.stderr.write(
            "O que fazer: tire o valor do código e leia do ambiente/cofre (Supabase Vault ou secrets,\n"
            "arquivo de env do serviço, credencial do n8n). Se o segredo JÁ foi publicado, ele está\n"
            "queimado: rotacione, não basta apagar o commit. Falso positivo é decisão do humano.\n"
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
