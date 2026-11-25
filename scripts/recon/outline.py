"""Mostra a árvore estrutural de partes do snapshot sanitizado (sem texto).

    python scripts/recon/outline.py docs/recon/raw/wa-snapshot.html

Imprime, para uma mensagem enviada (data-id true_) e uma recebida (false_),
cada nó com tag, role, data-testid, data-icon, aria-label genérico e o número
de classes — o suficiente para escolher seletores estáveis.
"""
import sys
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "path", "circle", "rect", "polygon", "line", "ellipse"}


class Node:
    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.parent, self.children, self.text = tag, dict(attrs), parent, [], 0


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", {}, None)
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, data):
        if data.strip():
            self.cur.text += len(data.strip())


def walk(n):
    yield n
    for c in n.children:
        yield from walk(c)


def sig(n):
    a = n.attrs
    parts = [n.tag]
    for k in ("id", "role", "data-testid", "data-icon", "data-tab", "aria-label", "contenteditable", "tabindex"):
        if k in a and a[k] is not None:
            parts.append(f'{k}="{a[k]}"')
    if "data-id" in a:
        parts.append(f'data-id="{a["data-id"][:6]}…"')
    if "data-pre-plain-text" in a:
        parts.append("data-pre-plain-text")
    cls = (a.get("class") or "").split()
    if cls:
        parts.append(f"cls×{len(cls)}")
    if n.text:
        parts.append(f"txt:{n.text}")
    return " ".join(parts)


def show(n, depth=0, maxd=18):
    if depth > maxd or n.tag in ("svg",) and depth > 2:
        return
    print("  " * depth + sig(n))
    for c in n.children:
        if c.tag in ("path", "title", "g"):
            continue
        show(c, depth + 1, maxd)


tree = Tree()
tree.feed(open(sys.argv[1], encoding="utf8").read())
nodes = list(walk(tree.root))
rows = [n for n in nodes if n.attrs.get("role") == "row" and any("data-id" in x.attrs for x in walk(n))]
print(f"linhas de mensagem: {len(rows)}")
for icon, label in (("tail-out", "ENVIADA"), ("tail-in", "RECEBIDA")):
    row = next((r for r in rows if any(x.attrs.get("data-icon") == icon for x in walk(r))), None)
    print(f"\n===== mensagem {label} (tem {icon}) =====")
    if row:
        show(row)
for tid in sys.argv[2:]:
    n = next((x for x in nodes if x.attrs.get("data-testid") == tid), None)
    print(f"\n===== data-testid={tid} =====")
    if n:
        show(n, maxd=9)
