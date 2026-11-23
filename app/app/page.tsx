"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AnchorProvider, BN, Idl, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js";
import {
  ConnectionProvider,
  useAnchorWallet,
  useWallet,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import idl from "../public/findchain.json";
import { Buffer } from "buffer";

const PROGRAM_ID = new PublicKey("69WsUdhb9Xnqc8Wacit3TDEpoFekvh9qDLpgidv7Rmo3");
const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet");

type ItemAccount = {
  authority: PublicKey;
  itemId: BN;
  title: string;
  description: string;
  location: string;
  claimant: PublicKey | null;
  status: Record<string, unknown>;
  createdAt: BN;
};

type Entry = { publicKey: PublicKey; account: ItemAccount };
type Filter = "all" | "found" | "claimed" | "returned" | "mine";
type Feedback = { kind: "success" | "error"; message: string; signature?: string };
type ItemForm = { title: string; description: string; location: string };

const EMPTY_FORM: ItemForm = { title: "", description: "", location: "" };

const readOnlyWallet = {
  publicKey: PublicKey.default,
  signTransaction: async (transaction: unknown) => transaction,
  signAllTransactions: async (transactions: unknown[]) => transactions,
};

function statusOf(status: Record<string, unknown>) {
  return (Object.keys(status)[0] ?? "unknown").toLowerCase();
}

function statusLabel(status: string) {
  if (status === "found") return "Disponible";
  if (status === "claimed") return "Solicitud recibida";
  if (status === "returned") return "Devuelto";
  return "Desconocido";
}

function shortAddress(key: PublicKey | null | undefined) {
  if (!key) return "—";
  const value = key.toBase58();
  return value.slice(0, 4) + "…" + value.slice(-4);
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function explainError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/This account may not be used to pay transaction fees|Attempt to debit an account but found no record|insufficient funds|insufficient lamports/i.test(message)) {
    return "La wallet no tiene SOL suficiente en Devnet para pagar esta operación. Consigue SOL de prueba en un faucet y vuelve a intentarlo.";
  }
  if (/SelfClaim|6005|custom program error: 0x1775/i.test(message)) {
    return "No puedes solicitar un objeto que tú mismo reportaste.";
  }
  if (/ItemNotClaimable|AlreadyClaimed|6004|6006/i.test(message)) {
    return "Este objeto ya no está disponible para recibir solicitudes.";
  }
  if (/User rejected|rejected the request|Transaction was cancelled/i.test(message)) {
    return "La operación fue cancelada desde la wallet. No se registró ningún cambio.";
  }

  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 260 ? clean.slice(0, 257) + "…" : clean;
}

function Shell() {
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();

  const [items, setItems] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState<ItemForm>(EMPTY_FORM);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const connection = useMemo(() => new Connection(endpoint, "confirmed"), []);
  const program = useMemo(() => {
    const provider = new AnchorProvider(
      connection,
      (anchorWallet ?? readOnlyWallet) as never,
      { commitment: "confirmed" },
    );
    return new Program(idl as Idl, provider) as any;
  }, [anchorWallet, connection]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const rows = (await program.account.item.all()) as Entry[];
      rows.sort(
        (a, b) =>
          b.account.createdAt.toNumber() - a.account.createdAt.toNumber(),
      );
      setItems(rows);
    } catch (error) {
      setLoadError("No se pudieron cargar los registros de Devnet: " + explainError(error));
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const transact = useCallback(
    async (action: () => Promise<string>, successMessage: string): Promise<boolean> => {
      if (!wallet.publicKey || !anchorWallet) {
        setFeedback({
          kind: "error",
          message: "Conecta Phantom para firmar esta operación.",
        });
        return false;
      }

      setBusy(true);
      setFeedback(null);
      try {
        const signature = await action();
        await refresh();
        setFeedback({ kind: "success", message: successMessage, signature });
        return true;
      } catch (error) {
        setFeedback({ kind: "error", message: explainError(error) });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [anchorWallet, refresh, wallet.publicKey],
  );

  const createItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!program || !wallet.publicKey) return;

    const title = form.title.trim();
    const description = form.description.trim();
    const location = form.location.trim();

    if (
      !title ||
      !description ||
      !location ||
      byteLength(title) > 64 ||
      byteLength(description) > 280 ||
      byteLength(location) > 100
    ) {
      setFeedback({
        kind: "error",
        message: "Revisa los campos y sus límites de bytes antes de publicar.",
      });
      return;
    }

    // Unique per report, generated automatically. The program stores a u64.
    const itemId = new BN(Date.now() * 1000 + Math.floor(Math.random() * 1000));
    const [item] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("item"),
        wallet.publicKey.toBuffer(),
        itemId.toArrayLike(Buffer, "le", 8),
      ],
      PROGRAM_ID,
    );

    const created = await transact(
      () =>
        program.methods
          .createItem(itemId, title, description, location)
          .accountsPartial({
            authority: wallet.publicKey,
            item,
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
      "Reporte publicado en Solana Devnet.",
    );

    if (created) setForm(EMPTY_FORM);
  };

  const requestReturn = (entry: Entry) => {
    void transact(
      () =>
        program.methods
          .claimItem(entry.account.itemId)
          .accountsPartial({
            claimant: wallet.publicKey,
            item: entry.publicKey,
          })
          .rpc(),
      "Solicitud registrada. El usuario que encontró el objeto debe confirmar la entrega.",
    );
  };

  const confirmReturn = (entry: Entry) => {
    void transact(
      () =>
        program.methods
          .markReturned(entry.account.itemId)
          .accountsPartial({
            authority: wallet.publicKey,
            item: entry.publicKey,
          })
          .rpc(),
      "Devolución confirmada en la blockchain.",
    );
  };

  const closeReport = (entry: Entry) => {
    const confirmed = window.confirm(
      "¿Cerrar este reporte? La cuenta del objeto se cerrará en Solana y dejará de aparecer en el listado.",
    );
    if (!confirmed) return;

    void transact(
      () =>
        program.methods
          .closeItem(entry.account.itemId)
          .accountsPartial({
            authority: wallet.publicKey,
            item: entry.publicKey,
          })
          .rpc(),
      "Reporte cerrado. La cuenta on-chain fue liberada.",
    );
  };

  const openEditor = (entry: Entry) => {
    setEditing(entry);
    setEditForm({
      title: entry.account.title,
      description: entry.account.description,
      location: entry.account.location,
    });
    setFeedback(null);
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || !wallet.publicKey) return;

    const title = editForm.title.trim();
    const description = editForm.description.trim();
    const location = editForm.location.trim();

    if (
      !title ||
      !description ||
      !location ||
      byteLength(title) > 64 ||
      byteLength(description) > 280 ||
      byteLength(location) > 100
    ) {
      setFeedback({
        kind: "error",
        message: "Revisa los campos y sus límites de bytes antes de guardar.",
      });
      return;
    }

    const updated = await transact(
      () =>
        program.methods
          .updateItem(editing.account.itemId, title, description, location)
          .accountsPartial({
            authority: wallet.publicKey,
            item: editing.publicKey,
          })
          .rpc(),
      "Reporte actualizado.",
    );
    if (updated) setEditing(null);
  };

  const walletAddress = wallet.publicKey?.toBase58();
  const ownItems = items.filter(
    (entry) => entry.account.authority.toBase58() === walletAddress,
  );
  const foundCount = items.filter((entry) => statusOf(entry.account.status) === "found").length;
  const claimedCount = items.filter((entry) => statusOf(entry.account.status) === "claimed").length;
  const returnedCount = items.filter((entry) => statusOf(entry.account.status) === "returned").length;

  const visibleItems = items.filter((entry) => {
    const status = statusOf(entry.account.status);
    const mine = entry.account.authority.toBase58() === walletAddress;
    const matchesFilter =
      filter === "all" ||
      (filter === "mine" && mine) ||
      status === filter;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [entry.account.title, entry.account.description, entry.account.location]
        .join(" ")
        .toLowerCase()
        .includes(query);
    return matchesFilter && matchesSearch;
  });

  const canPublish =
    Boolean(wallet.connected && anchorWallet) &&
    form.title.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.location.trim().length > 0 &&
    byteLength(form.title.trim()) <= 64 &&
    byteLength(form.description.trim()) <= 280 &&
    byteLength(form.location.trim()) <= 100 &&
    !busy;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="FindChain inicio">
          <span className="brand-mark">F</span>
          <span>findchain</span>
        </a>
        <div className="network-indicator">
          <span className="network-dot" />
          Solana Devnet
        </div>
        <div className="wallet-area">
          <span className="wallet-caption">
            {wallet.publicKey ? shortAddress(wallet.publicKey) : "Wallet desconectada"}
          </span>
          <WalletMultiButton />
        </div>
      </header>

      <section className="intro-row">
        <div className="intro-copy">
          <p className="eyebrow">LOST & FOUND · ON-CHAIN</p>
          <h1>Lo que se encuentra, <em>puede volver.</em></h1>
          <p>Publica un objeto, reconoce uno perdido y coordina su devolución. Todo el ciclo queda registrado en Solana.</p>
        </div>
        <div className="stats-strip" aria-label="Resumen de reportes">
          <div><strong>{items.length.toString().padStart(2, "0")}</strong><span>Reportes</span></div>
          <div><strong>{foundCount.toString().padStart(2, "0")}</strong><span>Disponibles</span></div>
          <div><strong>{claimedCount.toString().padStart(2, "0")}</strong><span>Solicitudes</span></div>
          <div><strong>{returnedCount.toString().padStart(2, "0")}</strong><span>Devueltos</span></div>
        </div>
      </section>

      {feedback && (
        <aside className={"feedback " + feedback.kind} role="status">
          <div className="feedback-copy">
            <strong>{feedback.kind === "success" ? "Operación completada" : "No se pudo completar"}</strong>
            <span>{feedback.message}</span>
            {feedback.signature && (
              <a
                href={"https://explorer.solana.com/tx/" + feedback.signature + "?cluster=devnet"}
                target="_blank"
                rel="noreferrer"
              >
                Ver transacción en Solana Explorer ↗
              </a>
            )}
          </div>
          <button className="dismiss-button" onClick={() => setFeedback(null)} aria-label="Cerrar aviso">×</button>
        </aside>
      )}

      {loadError && <div className="load-error">{loadError}</div>}

      <section className="workspace">
        <aside className="report-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PASO 01 · PUBLICAR</p>
              <h2>¿Encontraste algo?</h2>
            </div>
            <span className="step-number">01</span>
          </div>
          <p className="panel-description">
            Crea un registro público para que su propietario pueda reconocerlo y solicitar su devolución.
          </p>

          <form className="report-form" onSubmit={createItem}>
            <label htmlFor="item-title">¿Qué objeto encontraste?</label>
            <input
              id="item-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Ej. Mochila negra"
              maxLength={64}
              required
            />
            <div className="field-meta"><span>Nombre del objeto</span><span>{byteLength(form.title)}/64 bytes</span></div>

            <label htmlFor="item-description">Detalles para reconocerlo</label>
            <textarea
              id="item-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Color, marca, características visibles..."
              maxLength={280}
              rows={3}
              required
            />
            <div className="field-meta"><span>No publiques datos privados</span><span>{byteLength(form.description)}/280 bytes</span></div>

            <label htmlFor="item-location">¿Dónde lo encontraste?</label>
            <input
              id="item-location"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              placeholder="Ej. Biblioteca central"
              maxLength={100}
              required
            />
            <div className="field-meta"><span>Usa una ubicación general</span><span>{byteLength(form.location)}/100 bytes</span></div>

            <div className="privacy-note">
              <span className="privacy-icon">i</span>
              <span>El reporte será público y permanente mientras la cuenta esté activa. No incluyas teléfonos, direcciones particulares ni información sensible.</span>
            </div>

            <button className="publish-button" type="submit" disabled={!canPublish}>
              {busy ? <><span className="spinner" /> Procesando…</> : "Publicar reporte"}
            </button>
            {!wallet.connected && (
              <p className="connect-hint">Conecta Phantom para publicar. Necesitas SOL de Devnet para las comisiones.</p>
            )}
            {wallet.connected && !anchorWallet && (
              <p className="connect-hint">Esperando autorización de la wallet…</p>
            )}
          </form>
          <div className="workflow-hint">
            <span className="workflow-line" />
            <div><strong>¿Qué pasa después?</strong><p>Otra persona puede reconocer el objeto y enviar una solicitud. Tú confirmarás la entrega cuando se realice.</p></div>
          </div>
        </aside>

        <section className="board-panel" aria-label="Tablón de objetos reportados">
          <div className="board-heading">
            <div>
              <p className="eyebrow">PASO 02 · EXPLORAR</p>
              <h2>Objetos reportados</h2>
              <p className="board-subtitle">Encuentra un objeto o revisa las solicitudes recibidas.</p>
            </div>
            <button className="refresh-button" onClick={() => void refresh()} disabled={loading || busy} title="Actualizar registros">
              <span className={loading ? "refresh-symbol spinning" : "refresh-symbol"}>↻</span>
              Actualizar
            </button>
          </div>

          <div className="board-controls">
            <div className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por objeto o ubicación..."
                aria-label="Buscar reportes"
              />
              {search && <button onClick={() => setSearch("")} aria-label="Limpiar búsqueda">×</button>}
            </div>
            <div className="filter-row" role="group" aria-label="Filtrar reportes">
              {([
                ["all", "Todos"],
                ["found", "Disponibles"],
                ["claimed", "Con solicitud"],
                ["returned", "Devueltos"],
                ["mine", "Mis reportes"],
              ] as [Filter, string][]).map(([value, label]) => (
                <button
                  key={value}
                  className={"filter-chip " + (filter === value ? "active" : "")}
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                >
                  {label}
                  {value === "mine" && walletAddress ? <span>{ownItems.length}</span> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="results-caption">
            <span>{visibleItems.length} {visibleItems.length === 1 ? "reporte" : "reportes"}</span>
            <span>Registros públicos en Devnet</span>
          </div>

          <div className="item-list">
            {loading && items.length === 0 ? (
              <div className="empty-state"><span className="large-spinner" /><strong>Cargando registros</strong><p>Consultando Solana Devnet…</p></div>
            ) : visibleItems.length === 0 ? (
              <div className="empty-state">
                <span className="empty-symbol">⌕</span>
                <strong>{filter === "mine" ? "Todavía no tienes reportes" : "No encontramos reportes"}</strong>
                <p>{filter === "mine" ? "Cuando publiques un objeto, podrás gestionarlo desde aquí." : "Prueba otra búsqueda o cambia el filtro."}</p>
                {filter !== "all" && <button className="text-button" onClick={() => { setFilter("all"); setSearch(""); }}>Ver todos los reportes</button>}
              </div>
            ) : (
              visibleItems.map((entry) => {
                const status = statusOf(entry.account.status);
                const isOwner = entry.account.authority.toBase58() === walletAddress;
                const isClaimant = entry.account.claimant?.toBase58() === walletAddress;

                return (
                  <article className="item-row" key={entry.publicKey.toBase58()}>
                    <div className="item-main">
                      <div className="item-title-line">
                        <h3>{entry.account.title}</h3>
                        <span className={"status-pill " + status}>{statusLabel(status)}</span>
                      </div>
                      <p className="item-description">{entry.account.description}</p>
                      <div className="item-meta">
                        <span><b>Ubicación</b> {entry.account.location}</span>
                        <span><b>Reportó</b> {shortAddress(entry.account.authority)}</span>
                        <span><b>Fecha</b> {new Date(entry.account.createdAt.toNumber() * 1000).toLocaleDateString("es-EC")}</span>
                      </div>
                      {status === "claimed" && (
                        <p className="claim-note">
                          {isOwner
                            ? "Alguien reconoce este objeto. Coordina la entrega y confirma cuando se haya realizado."
                            : isClaimant
                              ? "Tu solicitud quedó registrada. Espera la confirmación de quien encontró el objeto."
                              : "Este objeto ya tiene una solicitud de devolución en curso."}
                        </p>
                      )}
                    </div>

                    <div className="item-actions">
                      {status === "found" && !isOwner && (
                        <button
                          className="action-button request-button"
                          disabled={busy || !wallet.connected}
                          onClick={() => requestReturn(entry)}
                        >
                          Lo reconozco
                        </button>
                      )}
                      {status === "found" && isOwner && (
                        <button className="action-button secondary-action" disabled={busy} onClick={() => openEditor(entry)}>
                          Editar
                        </button>
                      )}
                      {status === "claimed" && isOwner && (
                        <button className="action-button confirm-button" disabled={busy} onClick={() => confirmReturn(entry)}>
                          Confirmar entrega
                        </button>
                      )}
                      {status === "claimed" && isClaimant && (
                        <span className="waiting-label">Solicitud enviada</span>
                      )}
                      {status === "returned" && isOwner && (
                        <button className="action-button secondary-action" disabled={busy} onClick={() => closeReport(entry)}>
                          Cerrar reporte
                        </button>
                      )}
                      <a
                        className="pda-link"
                        href={"https://explorer.solana.com/address/" + entry.publicKey.toBase58() + "?cluster=devnet"}
                        target="_blank"
                        rel="noreferrer"
                        title="Ver cuenta del objeto en Solana Explorer"
                      >
                        Verificar ↗
                      </a>
                    </div>
                  </article>
                );
              })
            )}
          </div>
          <div className="board-footer">
            <span><span className="footer-dot" /> Datos consultados directamente desde Solana Devnet</span>
            <span>FindChain · {PROGRAM_ID.toBase58().slice(0, 6)}…{PROGRAM_ID.toBase58().slice(-4)}</span>
          </div>
        </section>
      </section>

      <footer className="app-footer">
        <span>FindChain</span>
        <span>Un registro verificable para que los objetos encuentren el camino de vuelta.</span>
      </footer>

      {editing && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}>
          <section className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title">
            <div className="modal-heading">
              <div><p className="eyebrow">GESTIONAR REPORTE</p><h2 id="edit-title">Editar objeto</h2></div>
              <button className="dismiss-button" onClick={() => setEditing(null)} aria-label="Cerrar">×</button>
            </div>
            <form className="report-form" onSubmit={saveEdit}>
              <label htmlFor="edit-title-field">Objeto</label>
              <input id="edit-title-field" value={editForm.title} maxLength={64} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} required />
              <div className="field-meta"><span>Nombre del objeto</span><span>{byteLength(editForm.title)}/64 bytes</span></div>
              <label htmlFor="edit-description-field">Descripción</label>
              <textarea id="edit-description-field" value={editForm.description} maxLength={280} rows={3} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} required />
              <div className="field-meta"><span>Detalles visibles</span><span>{byteLength(editForm.description)}/280 bytes</span></div>
              <label htmlFor="edit-location-field">Ubicación general</label>
              <input id="edit-location-field" value={editForm.location} maxLength={100} onChange={(event) => setEditForm({ ...editForm, location: event.target.value })} required />
              <div className="field-meta"><span>Evita direcciones particulares</span><span>{byteLength(editForm.location)}/100 bytes</span></div>
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setEditing(null)}>Cancelar</button>
                <button type="submit" className="publish-button" disabled={busy}>
                  {busy ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default function Page() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider><Shell /></WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
