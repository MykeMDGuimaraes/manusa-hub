#!/usr/bin/env python3
"""Guarda de segredo no CI (Dia Solutions).

Roda no GitHub Actions, em todo push e pull request, e varre as linhas ADICIONADAS
pelos commits que o evento traz, com a mesma varredura dos hooks de commit da casa
(casa-segredos.py, cópia ao lado). Existe porque agente que commita na nuvem
não passa pelos hooks do notebook.

Nunca imprime valor: só commit (8 caracteres), arquivo, linha e regra.

Sem proteção de branch, o guarda não barra o push. Ele reprova o CI e, no push,
abre a issue de alerta para o dono do repositório (ou comenta na que já estiver
aberta). Para isso precisa de GH_TOKEN com permissão de escrever issue.

Uso, no Actions (que define GITHUB_EVENT_NAME e GITHUB_EVENT_PATH):
  python3 -I scripts/guarda-segredo/ci.py
Sai com 0 se limpo, 1 se achou algo, 2 se não conseguiu varrer.
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

AQUI = Path(__file__).resolve().parent
VARREDOR = AQUI / "casa-segredos.py"
ZERO = "0" * 40
TITULO = "[guarda-segredo]"
ACHADO = re.compile(r"^  \S{8} .+  \[.+\]$")  # "  <commit> <arquivo>[:<linha>]  [<regra>]"
# Aviso do casa-segredos.py feito para o notebook; no CI a lista de prefixos reais nunca existe.
AVISO_DO_NOTEBOOK = ("casa-segredos: lista de prefixos reais ausente", "Rode o instalar.sh do dia-casa")


def existe(ref):
    r = subprocess.run(["git", "rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}"], capture_output=True)
    return r.returncode == 0


def faixa(evento, dados, existe=existe):
    """Argumentos do git rev-list com os commits que o evento traz; [] quando não há o que varrer."""
    if evento == "pull_request":
        pr = dados["pull_request"]
        base, cabeca = pr["base"]["sha"], pr["head"]["sha"]
        return [cabeca, f"^{base}" if existe(base) else f"^origin/{pr['base']['ref']}"]
    if evento == "push":
        antes, depois = dados.get("before") or ZERO, dados.get("after") or ZERO
        if depois == ZERO:
            return []  # branch apagada
        if antes != ZERO and existe(antes):
            return [depois, f"^{antes}"]
        padrao = dados["repository"]["default_branch"]
        if dados.get("ref") == f"refs/heads/{padrao}" or not existe(f"origin/{padrao}"):
            return [depois]  # primeira subida, ou o antes sumiu num force-push na padrão: varre tudo
        return [depois, f"^origin/{padrao}"]  # branch nova (ou force-push nela): o que ainda não está na padrão
    raise ValueError(f"evento sem faixa definida: {evento}")


def avisar(dados, achados, env, abrir=urllib.request.urlopen):
    """Abre a issue de alerta para o dono, ou comenta na que já está aberta. Devolve o que fez, em uma linha."""
    token = env.get("GH_TOKEN") or env.get("GITHUB_TOKEN")
    if not token:
        return "guarda-segredo: sem GH_TOKEN, não abri a issue de alerta; o CI reprovado é o único aviso"
    repo = env.get("GITHUB_REPOSITORY") or dados["repository"]["full_name"]
    dono_do_repo = dados.get("repository", {}).get("owner", {})
    dono = env.get("GITHUB_REPOSITORY_OWNER") or dono_do_repo.get("login") or dono_do_repo.get("name")
    api = env.get("GITHUB_API_URL", "https://api.github.com")
    execucao = f"{env.get('GITHUB_SERVER_URL', 'https://github.com')}/{repo}/actions/runs/{env.get('GITHUB_RUN_ID', '')}"
    ref = (dados.get("ref") or "").removeprefix("refs/heads/")
    ate = (dados.get("after") or "")[:8]
    quem = (dados.get("pusher") or {}).get("name") or env.get("GITHUB_ACTOR") or "?"
    corpo = "\n".join([
        f"O guarda de segredo reprovou o push em `{ref}` (até `{ate}`), feito por `{quem}`.",
        "",
        "Achados (o valor fica de fora de propósito):",
        "",
        "```",
        *[a.strip() for a in achados],
        "```",
        "",
        "O que fazer: tire o valor do código e leia do ambiente ou do cofre. Segredo que chegou ao GitHub "
        "está queimado: rotacione, apagar o commit não basta. O dump `.manus/` fica fora do git (`.gitignore`).",
        "",
        f"Execução: {execucao}",
    ])

    def pedir(metodo, caminho, conteudo=None):
        req = urllib.request.Request(
            f"{api}{caminho}", method=metodo,
            data=None if conteudo is None else json.dumps(conteudo).encode("utf-8"),
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
                     "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "guarda-segredo"})
        with abrir(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8") or "null")

    try:
        abertas = pedir("GET", f"/repos/{repo}/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100")
        aberta = next((i for i in abertas or [] if str(i.get("title", "")).startswith(TITULO)
                       and "pull_request" not in i), None)
        if aberta:
            pedir("POST", f"/repos/{repo}/issues/{aberta['number']}/comments", {"body": corpo})
            return f"guarda-segredo: comentei na issue de alerta #{aberta['number']}"
        pedido = {"title": f"{TITULO} achado no push em {ref} ({ate})", "body": corpo}
        if dono:
            pedido["assignees"] = [dono]
        nova = pedir("POST", f"/repos/{repo}/issues", pedido)
        return f"guarda-segredo: abri a issue de alerta #{nova['number']}" + (f" para {dono}" if dono else "")
    except (urllib.error.URLError, OSError, ValueError, KeyError, TypeError) as erro:
        return f"guarda-segredo: não consegui abrir a issue de alerta ({type(erro).__name__}: {erro})"


def main():
    for fluxo in (sys.stdout, sys.stderr):
        try:
            fluxo.reconfigure(encoding="utf-8")
        except AttributeError:
            pass
    evento, caminho = os.environ.get("GITHUB_EVENT_NAME", ""), os.environ.get("GITHUB_EVENT_PATH", "")
    if not evento or not caminho:
        print("guarda-segredo: rode no GitHub Actions (faltam GITHUB_EVENT_NAME e GITHUB_EVENT_PATH)", file=sys.stderr)
        return 2
    with open(caminho, encoding="utf-8") as f:
        dados = json.load(f)
    try:
        args = faixa(evento, dados)
    except (KeyError, TypeError, ValueError) as erro:
        print(f"guarda-segredo: não sei que commits o evento {evento} traz ({erro!r})", file=sys.stderr)
        return 2
    if not args:
        print("guarda-segredo: branch apagada, nada a varrer")
        return 0
    contagem = subprocess.run(["git", "rev-list", "--count", *args], capture_output=True, text=True)
    if contagem.returncode != 0:
        sys.stderr.write(contagem.stderr)
        print(f"guarda-segredo: não consegui listar os commits ({' '.join(args)})", file=sys.stderr)
        return 2
    n = int(contagem.stdout.strip())
    print(f"guarda-segredo: evento {evento}, {n} commit(s) a varrer: {' '.join(args)}")
    print("guarda-segredo: no CI rodam os padrões genéricos; a lista de prefixos reais da casa não sai do notebook")
    r = subprocess.run([sys.executable, "-I", str(VARREDOR), "--range", *args], capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    sys.stdout.write(r.stdout)
    for linha in r.stderr.splitlines():
        if not linha.startswith(AVISO_DO_NOTEBOOK):
            print(linha, file=sys.stderr)
    if r.returncode == 1:
        if evento == "push":
            achados = [linha for linha in r.stderr.splitlines() if ACHADO.match(linha)]
            print(avisar(dados, achados, os.environ), file=sys.stderr)
        return 1
    if r.returncode == 0:
        print(f"guarda-segredo: limpo, {n} commit(s) varrido(s)")
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
