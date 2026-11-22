# Guarda de segredo

Em todo push e todo pull request, o guarda varre as linhas que os commits adicionam. Usa a mesma regra dos hooks de commit da casa.

Ele existe porque agente que commita na nuvem não passa pelos hooks do notebook.

O workflow é `.github/workflows/guarda-segredo.yml`.

| Arquivo | O que é |
|---|---|
| `casa-segredos.py` | Cópia de `hooks/casa-segredos.py` do repositório dia-casa (blob `88ba12d6ef36`, PR dia-casa#83). Não edite aqui: mude no dia-casa e copie de novo. |
| `ci.py` | Lê o evento do Actions, acha os commits novos e chama `casa-segredos.py --range`. Quando reprova um push, abre a issue de alerta para o dono, ou comenta na que já estiver aberta. |
| `test_guarda_segredo.py` | Teste do ataque. Reprova: token falso da Meta em `.manus/db/*.json` e chave falsa do Freepik em `.md`. Passa: commit limpo, remoção do segredo e vazamento antigo. |

Para rodar o teste: `python3 -I scripts/guarda-segredo/test_guarda_segredo.py`. No Windows, use `py -3 -I` no lugar de `python3 -I`.

Para conferir se a cópia está igual à do dia-casa, os dois comandos têm de dar o mesmo blob:

- `git hash-object --no-filters scripts/guarda-segredo/casa-segredos.py`
- `git -C <dia-casa> rev-parse main:hooks/casa-segredos.py`

## Limites

- Não barra o push. Sem proteção de branch, ele só reprova o CI e avisa o dono.
- Não limpa o que já entrou. Segredo que chegou ao GitHub está queimado: rotacione.
- Roda só os padrões genéricos. A lista de prefixos reais da casa não sai do notebook.
- Não lê o conteúdo de arquivo binário. O dump `.manus/` é a exceção: vale pelo nome do arquivo, binário ou não.
