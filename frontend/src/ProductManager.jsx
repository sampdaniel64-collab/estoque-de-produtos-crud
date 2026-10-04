import { useEffect, useState } from "react";
import "./ProductManager.css";

const API = "http://localhost:3001/api/produtos";
const ESTOQUE_BAIXO = 5;
const VAZIO = { nome: "", sku: "", preco: "", quantidade: "" };

const moeda = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ProductManager() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  // READ
  async function carregar(q = "") {
    try {
      const res = await fetch(`${API}?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      setProdutos(await res.json());
      setErro("");
    } catch {
      setErro("Não foi possível conectar à API. Verifique se o servidor está rodando.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => carregar(busca), 250);
    return () => clearTimeout(t);
  }, [busca]);

  const alterar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // CREATE / UPDATE
  async function salvar() {
    const corpo = {
      ...form,
      preco: Number(form.preco),
      quantidade: form.quantidade === "" ? NaN : Number(form.quantidade),
    };
    const res = await fetch(editandoId ? `${API}/${editandoId}` : API, {
      method: editandoId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dados = await res.json();
    if (!res.ok) return setErro(dados.erro);

    cancelar();
    carregar(busca);
  }

  function editar(p) {
    setEditandoId(p.id);
    setForm({ nome: p.nome, sku: p.sku, preco: p.preco, quantidade: p.quantidade });
    setErro("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelar() {
    setEditandoId(null);
    setForm(VAZIO);
    setErro("");
  }

  // DELETE
  async function excluir(p) {
    if (!window.confirm(`Excluir "${p.nome}"? Essa ação não pode ser desfeita.`)) return;
    const res = await fetch(`${API}/${p.id}`, { method: "DELETE" });
    if (!res.ok) return setErro("Não foi possível excluir o produto.");
    if (editandoId === p.id) cancelar();
    carregar(busca);
  }

  const totalItens = produtos.reduce((s, p) => s + p.quantidade, 0);
  const valorTotal = produtos.reduce((s, p) => s + p.quantidade * p.preco, 0);

  return (
    <main className="pm">
      <header className="pm-topo">
        <h1>Estoque</h1>
        <p className="pm-resumo">
          {produtos.length} produtos · {totalItens} unidades · {moeda(valorTotal)} em estoque
        </p>
      </header>

      <section className="pm-form" aria-label={editandoId ? "Editar produto" : "Novo produto"}>
        <h2>{editandoId ? "Editar produto" : "Novo produto"}</h2>
        <div className="pm-campos">
          <label>
            Nome
            <input name="nome" value={form.nome} onChange={alterar} />
          </label>
          <label>
            SKU
            <input name="sku" value={form.sku} onChange={alterar} />
          </label>
          <label>
            Preço (R$)
            <input name="preco" type="number" min="0" step="0.01" value={form.preco} onChange={alterar} />
          </label>
          <label>
            Quantidade
            <input name="quantidade" type="number" min="0" step="1" value={form.quantidade} onChange={alterar} />
          </label>
        </div>
        {erro && <p className="pm-erro" role="alert">{erro}</p>}
        <div className="pm-acoes">
          <button className="pm-primario" onClick={salvar}>
            {editandoId ? "Salvar alterações" : "Adicionar produto"}
          </button>
          {editandoId && <button onClick={cancelar}>Cancelar</button>}
        </div>
      </section>

      <section aria-label="Lista de produtos">
        <input
          className="pm-busca"
          type="search"
          placeholder="Buscar por nome ou SKU"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {carregando ? (
          <p className="pm-vazio">Carregando produtos...</p>
        ) : produtos.length === 0 ? (
          <p className="pm-vazio">
            {busca ? "Nenhum produto encontrado para essa busca." : "Nenhum produto cadastrado. Preencha o formulário acima para adicionar o primeiro."}
          </p>
        ) : (
          <div className="pm-tabela-wrap">
            <table className="pm-tabela">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th className="num">Preço</th>
                  <th className="num">Qtd.</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {produtos.map((p) => (
                  <tr key={p.id} className={editandoId === p.id ? "editando" : ""}>
                    <td>{p.nome}</td>
                    <td>{p.sku}</td>
                    <td className="num">{moeda(p.preco)}</td>
                    <td className={"num" + (p.quantidade <= ESTOQUE_BAIXO ? " baixo" : "")}>
                      {p.quantidade}
                      {p.quantidade <= ESTOQUE_BAIXO && <span className="selo">Estoque baixo</span>}
                    </td>
                    <td className="pm-linha-acoes">
                      <button onClick={() => editar(p)}>Editar</button>
                      <button className="pm-perigo" onClick={() => excluir(p)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
