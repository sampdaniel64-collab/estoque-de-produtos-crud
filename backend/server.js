const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, "produtos.json");

app.use(cors());
app.use(express.json());

// ---------- Persistência simples em arquivo JSON ----------
function ler() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return [];
  }
}

function salvar(produtos) {
  fs.writeFileSync(DB_FILE, JSON.stringify(produtos, null, 2));
}

// ---------- Validação ----------
function validar(body) {
  const erros = [];
  const nome = String(body.nome ?? "").trim();
  const sku = String(body.sku ?? "").trim();
  const preco = Number(body.preco);
  const quantidade = Number(body.quantidade);

  if (!nome) erros.push("Informe o nome do produto.");
  if (!sku) erros.push("Informe o SKU.");
  if (!Number.isFinite(preco) || preco < 0) erros.push("O preço deve ser um número maior ou igual a 0.");
  if (!Number.isInteger(quantidade) || quantidade < 0)
    erros.push("A quantidade deve ser um número inteiro maior ou igual a 0.");

  return { erros, dados: { nome, sku, preco, quantidade } };
}

// ---------- Rotas ----------

// READ (lista, com busca opcional por nome ou SKU)
app.get("/api/produtos", (req, res) => {
  const q = String(req.query.q ?? "").toLowerCase();
  let produtos = ler();
  if (q) {
    produtos = produtos.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }
  res.json(produtos);
});

// READ (um produto)
app.get("/api/produtos/:id", (req, res) => {
  const produto = ler().find((p) => p.id === req.params.id);
  if (!produto) return res.status(404).json({ erro: "Produto não encontrado." });
  res.json(produto);
});

// CREATE
app.post("/api/produtos", (req, res) => {
  const { erros, dados } = validar(req.body);
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });

  const produtos = ler();
  if (produtos.some((p) => p.sku.toLowerCase() === dados.sku.toLowerCase())) {
    return res.status(409).json({ erro: "Já existe um produto com esse SKU." });
  }

  const novo = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ...dados,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  produtos.push(novo);
  salvar(produtos);
  res.status(201).json(novo);
});

// UPDATE
app.put("/api/produtos/:id", (req, res) => {
  const { erros, dados } = validar(req.body);
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });

  const produtos = ler();
  const i = produtos.findIndex((p) => p.id === req.params.id);
  if (i === -1) return res.status(404).json({ erro: "Produto não encontrado." });

  if (produtos.some((p) => p.id !== req.params.id && p.sku.toLowerCase() === dados.sku.toLowerCase())) {
    return res.status(409).json({ erro: "Já existe um produto com esse SKU." });
  }

  produtos[i] = { ...produtos[i], ...dados, atualizadoEm: new Date().toISOString() };
  salvar(produtos);
  res.json(produtos[i]);
});

// DELETE
app.delete("/api/produtos/:id", (req, res) => {
  const produtos = ler();
  const restantes = produtos.filter((p) => p.id !== req.params.id);
  if (restantes.length === produtos.length) {
    return res.status(404).json({ erro: "Produto não encontrado." });
  }
  salvar(restantes);
  res.status(204).end();
});

app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
