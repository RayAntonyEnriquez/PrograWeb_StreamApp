import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import layoutStyles from "./Stream/StreamPage.module.css";
import viewerStyles from "./Viewer.module.css";
import { FaGift, FaSync } from "react-icons/fa";
import { api } from "../services/api";
import { useAuth } from "../app/auth";
import perfil from "../assets/perfil.jpg";
import categoriaImg from "../assets/categoria.png";
import streamsImg from "../assets/streams.png";

export default function StreamViewer() {
  const { room = "mi-sala" } = useParams();
  const [search] = useSearchParams();
  const { user, tokens } = useAuth();

  const streamId = useMemo(() => {
    const q = search.get("streamId");
    return q ? Number(q) : Number(import.meta.env.VITE_DEFAULT_STREAM_ID ?? 0);
  }, [search]);

  const sceneParam = search.get("scene");
  const [messages, setMessages] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [gifts, setGifts] = useState<any[]>([]);
  const [selectedGift, setSelectedGift] = useState<number | null>(null);
  const [overlayMsg, setOverlayMsg] = useState<string | null>(null);
  const [giftModalOpen, setGiftModalOpen] = useState(false);

  const viewerId = useMemo(() => {
    const q = search.get("viewerId");
    const parsed = q ? Number(q) : undefined;
    if (!Number.isNaN(parsed as number) && parsed !== undefined) return parsed!;
    const envViewer = Number(import.meta.env.VITE_DEFAULT_VIEWER_ID ?? 0);
    if (user?.perfilId) return user.perfilId;
    if (envViewer > 0) return envViewer;
    // fallback para evitar bloqueo del input aun sin perfilId en login
    return user ? 1 : null;
  }, [user?.perfilId, user, search]);

  const vdoViewerUrl = sceneParam
    ? decodeURIComponent(sceneParam)
    : `https://vdo.ninja/?scene&room=${encodeURIComponent(room)}`;

  const refresh = async () => {
    if (!streamId) {
      setMessages([]);
      setEvents([]);
      setError("Falta streamId. Pasa ?streamId= en la URL o define VITE_DEFAULT_STREAM_ID.");
      return;
    }
    setError(null);
    try {
      const [msgs, evs] = await Promise.all([
        api.getMensajes(streamId),
        api.getEventosRegalos(streamId, 20),
      ]);
      setMessages(msgs ?? []);
      setEvents(evs ?? []);
    } catch {
      setError("No se pudo cargar chat/eventos.");
      setMessages([]);
      setEvents([]);
    }
  };

  useEffect(() => { refresh(); }, [streamId]);
  useEffect(() => {
    const loadGifts = async () => {
      const streamerIdParam = search.get("streamerId");
      let streamerId = streamerIdParam ? Number(streamerIdParam) : Number(import.meta.env.VITE_DEFAULT_STREAMER_ID ?? 0);

      // Si no viene streamerId pero sí streamId, intenta derivarlo desde el backend
      if (!streamerId && streamId) {
        try {
          const info = await api.getStream(streamId, tokens?.accessToken);
          if (info?.streamerId) streamerId = info.streamerId;
        } catch {
          // ignore
        }
      }

      if (!streamerId) return;
      try {
        const data = await api.listGifts(streamerId, tokens?.accessToken);
        setGifts(data);
      } catch {
        setGifts([]);
      }
    };
    loadGifts();
  }, [search, tokens?.accessToken]);

  const handleSend = async () => {
    if (!streamId) {
      setError("Falta streamId para comentar.");
      return;
    }
    if (!viewerId) {
      setError("Inicia sesin o pasa viewerId para comentar.");
      return;
    }
    const text = input.trim();
    if (!text) return;
    try {
      await api.sendMensaje(streamId, { viewerId, mensaje: text }, tokens?.accessToken);
      setInput("");
      await refresh();
    } catch {
      setError("No se pudo enviar el mensaje.");
    }
  };

  const selectedGiftData = useMemo(
    () => gifts.find((g) => g.id === selectedGift) ?? null,
    [gifts, selectedGift]
  );

  const handleSendGift = async () => {
    if (!streamId || !viewerId || !selectedGift) {
      setOverlayMsg("Selecciona un regalo");
      return;
    }
    // Cerrar de inmediato para que la UI se sienta responsiva
    setGiftModalOpen(false);
    try {
      const resp = await api.enviarRegalo(
        streamId,
        selectedGift,
        { viewerId, cantidad: 1 },
        tokens?.accessToken
      );
      setOverlayMsg("Regalo enviado");
      await refresh();
      if (resp?.leveled_up) setOverlayMsg("Subiste de nivel!");
    } catch {
      setOverlayMsg("Error al enviar regalo");
    }
  };

  return (
    <div className={layoutStyles.shell}>
      <div className={viewerStyles.viewerGrid}>
        <main className={viewerStyles.mainColumn}>
          <div className={viewerStyles.streamHeader}>
            <img src={perfil} alt="Avatar canal" className={viewerStyles.avatar} />
            <div>
              <h1 className={viewerStyles.title}>Live - Sala {room}</h1>
              <div className={viewerStyles.actions}>
                <span className={viewerStyles.livePill}>LIVE</span>
              </div>
            </div>
          </div>

          <div className={viewerStyles.playerWrapper}>
            <div className={viewerStyles.playerInner}>
              <iframe
                src={vdoViewerUrl}
                title="Stream"
                allow="camera; microphone; fullscreen; speaker; display-capture"
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>
          </div>

          <div className={viewerStyles.bannerStack}>
            <img
              src={categoriaImg}
              alt="Categorías destacadas"
              className={viewerStyles.bannerImage}
            />
            <img
              src={streamsImg}
              alt="Streams recomendados"
              className={viewerStyles.bannerImage}
            />
          </div>

          <div className={viewerStyles.tabs}>
            <button className={viewerStyles.tabActive}>Acerca de</button>
            <button className={viewerStyles.tab}>Recomendado</button>
            <button className={viewerStyles.tab}>Clips</button>
         </div>
          <div className={viewerStyles.aboutCard}>
            <h2>Acerca de</h2>
            <p>Sala: {room}. Comparte este enlace: {window.location.href}</p>
            {error && <p style={{ color: "#f87171" }}>{error}</p>}
          </div>
          {events.length > 0 && (
            <div className={viewerStyles.aboutCard}>
              <h3>ltimos regalos</h3>
              <div className={viewerStyles.eventsList}>
                {events.map((e, idx) => (
                  <div key={idx} className={viewerStyles.eventItem}>
                    <span className={viewerStyles.eventUser}>{e.viewer_nombre ?? "Viewer"}</span>
                    <span className={viewerStyles.eventGift}>{e.gift_nombre ?? "Regalo"}</span>
                    {e.coins_gastados !== undefined && <span className={viewerStyles.eventCoins}>{e.coins_gastados} coins</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        <aside className={`${viewerStyles.chatColumn} ${!showChat ? viewerStyles.chatHidden : ""}`}>
          <div className={viewerStyles.chatHeader}>
            <h4>Chat del Stream</h4>
            <button className={viewerStyles.btnSubtle} onClick={() => setShowChat(!showChat)}>
              {showChat ? "Ocultar" : "Mostrar"}
            </button>
            <button className={viewerStyles.btnSubtle} onClick={refresh} title="Refrescar">
              <FaSync />
            </button>
          </div>
          <div className={viewerStyles.messages}>
            {messages.map((m) => (
              <div key={m.id} className={viewerStyles.chatLine}>
                <span className={viewerStyles.username}>{m.usuario_nombre ?? "Usuario"}:</span>
                <span className={viewerStyles.badge}>Lv {m.nivel_usuario ?? "-"}</span>
                <span className={viewerStyles.text}>{m.mensaje ?? ""}</span>
              </div>
            ))}
          </div>
          <div className={viewerStyles.giftBar}>
            <div className={viewerStyles.giftSummary}>
              <span>Regalo seleccionado</span>
              <strong>
                {selectedGiftData
                  ? `${selectedGiftData.nombre} (${selectedGiftData.costo_coins} coins, ${selectedGiftData.puntos_otorgados} pts)`
                  : "Ninguno"}
              </strong>
            </div>
            <div className={viewerStyles.giftActions}>
              <button className={viewerStyles.openGiftBtn} onClick={() => setGiftModalOpen(true)}>
                <FaGift /> Elegir regalo
              </button>
              <button
                className={viewerStyles.send}
                onClick={handleSendGift}
                disabled={!streamId || !viewerId || !selectedGift}
              >
                Enviar
              </button>
            </div>
          </div>
          <div className={viewerStyles.inputRow}>
            <input
              className={viewerStyles.input}
              type="text"
              placeholder={!streamId ? "Configura streamId" : "Enviar un mensaje"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={!streamId}
            />
            <button className={viewerStyles.send} onClick={handleSend} disabled={!streamId}>Enviar</button>
          </div>
          {error && <div className={viewerStyles.errorText}>{error}</div>}
          {giftModalOpen && (
            <div className={viewerStyles.modalBackdrop} onClick={() => setGiftModalOpen(false)}>
              <div className={viewerStyles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={viewerStyles.modalHeader}>
                  <h4>Elige un regalo</h4>
                  <button className={viewerStyles.closeBtn} onClick={() => setGiftModalOpen(false)}>x</button>
                </div>
                <div className={viewerStyles.giftGrid}>
                  {gifts.length === 0 && <p className={viewerStyles.emptyGifts}>No hay regalos disponibles.</p>}
                  {gifts.map((g) => (
                    <button
                      key={g.id}
                      className={`${viewerStyles.giftCard} ${selectedGift === g.id ? viewerStyles.giftCardActive : ""}`}
                      onClick={() => setSelectedGift(g.id)}
                    >
                      <div className={viewerStyles.giftName}>{g.nombre}</div>
                      <div className={viewerStyles.giftMeta}>
                        <span>{g.costo_coins} coins</span>
                        <span>{g.puntos_otorgados} pts</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className={viewerStyles.modalFooter}>
                  <div>
                    {selectedGiftData ? (
                      <>
                        <div className={viewerStyles.giftName}>{selectedGiftData.nombre}</div>
                        <div className={viewerStyles.giftMeta}>
                          <span>{selectedGiftData.costo_coins} coins</span>
                          <span>{selectedGiftData.puntos_otorgados} pts</span>
                        </div>
                      </>
                    ) : (
                      <span>Selecciona un regalo</span>
                    )}
                  </div>
                  <button
                    className={viewerStyles.send}
                    onClick={handleSendGift}
                    disabled={!streamId || !viewerId || !selectedGift}
                  >
                    Enviar regalo
                  </button>
                </div>
              </div>
            </div>
          )}
          {overlayMsg && (
            <div className={viewerStyles.toast} onAnimationEnd={() => setOverlayMsg(null)}>
              {overlayMsg}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}


