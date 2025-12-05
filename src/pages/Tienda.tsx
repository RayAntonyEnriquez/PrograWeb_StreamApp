import React, { useEffect, useState, useCallback } from "react";
import "./Tienda.css";
import OverlayNotification from "../components/OverlayNotification";
import coinIcon from "../assets/monedas.png";
import capybaraMascot from "../assets/capybara-coin-master.jpg";
import { api } from "../services/api";
import { useAuth } from "../app/auth";

type Pack = { id: number; coins: number; precio: number; nombre?: string; descripcion?: string };
type RouletteReward = { type: "coins" | "points"; amount: number; label: string; short?: string; color?: string };

const rewardOptions: RouletteReward[] = [
  { type: "coins", amount: 50, label: "+50 monedas", short: "50c", color: "#6B99FE" },
  { type: "coins", amount: 100, label: "+100 monedas", short: "100c", color: "#22c55e" },
  { type: "coins", amount: 200, label: "+200 monedas", short: "200c", color: "#a78bfa" },
  { type: "points", amount: 50, label: "+50 puntos", short: "50p", color: "#f59e0b" },
  { type: "points", amount: 100, label: "+100 puntos", short: "100p", color: "#38bdf8" },
  { type: "coins", amount: 500, label: "+500 monedas", short: "500c", color: "#f472b6" },
];

const Tienda = () => {
  const { user, tokens } = useAuth();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
  const [customCoins, setCustomCoins] = useState(500);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rouletteResult, setRouletteResult] = useState<RouletteReward | null>(null);
  const [rouletteUsed, setRouletteUsed] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinAngle, setSpinAngle] = useState(0);
  const rouletteGradient = `conic-gradient(${rewardOptions
    .map((r, idx) => {
      const start = (idx * 360) / rewardOptions.length;
      const end = ((idx + 1) * 360) / rewardOptions.length;
      return `${r.color} ${start}deg ${end}deg`;
    })
    .join(",")})`;

  const usuarioId = user?.id ?? Number(import.meta.env.VITE_DEFAULT_USER_ID ?? 0);
  const viewerId = user?.perfilId ?? Number(import.meta.env.VITE_DEFAULT_VIEWER_ID ?? 0);

  const fetchBalance = useCallback(async () => {
    if (!viewerId) {
      setBalance(null);
      return;
    }
    try {
      const data = await api.getViewerSaldo(viewerId, tokens?.accessToken);
      setBalance(Number(data.saldo_coins));
    } catch {
      setBalance(null);
    }
  }, [viewerId, tokens?.accessToken]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.listPaquetes(tokens?.accessToken);
        const normalized = data.map((p) => ({
          id: Number(p.id),
          coins: Number(p.coins),
          precio: Number(p.precio),
          nombre: p.nombre,
          descripcion: p.descripcion,
        }));
        setPacks(normalized);
        fetchBalance();
      } catch {
        setError("No se pudieron cargar los paquetes. Verifica el backend.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tokens?.accessToken, fetchBalance]);

  const handleOpenModal = (pack: Pack) => {
    setSelectedPack({
      ...pack,
      coins: Number(pack.coins),
      precio: Number(pack.precio),
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPack(null);
  };

  const handlePurchase = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!usuarioId || !selectedPack) {
      setError("Necesitas iniciar sesión para comprar.");
      return;
    }
    try {
      await api.comprarPaquete(usuarioId, selectedPack.id, tokens?.accessToken);
      setOverlayMessage(`Compra realizada: ${selectedPack.coins.toLocaleString()} monedas por $ ${selectedPack.precio.toFixed(2)}.`);
      setShowSuccess(true);
      await fetchBalance();
    } catch {
      setError("No se pudo completar la compra.");
    } finally {
      handleCloseModal();
    }
  };

  const handleCustomPurchase = async (event: React.FormEvent) => {
    event.preventDefault();
    const coins = Math.max(1, Number(customCoins) || 0);
    if (!usuarioId) {
      setError("Necesitas iniciar sesión para comprar.");
      return;
    }
    try {
      await api.comprarPersonalizado(usuarioId, coins, tokens?.accessToken);
      setOverlayMessage(`Compra realizada: ${coins.toLocaleString()} monedas.`);
      setShowSuccess(true);
      await fetchBalance();
    } catch {
      setError("No se pudo completar la compra personalizada.");
    }
  };

  // Ruleta diaria: solo espectadores, una vez al día (localStorage)
  useEffect(() => {
    if (!viewerId || user?.role !== "espectador") {
      setRouletteUsed(true);
      return;
    }
    const loadStatus = async () => {
      try {
        const status = await api.getRouletteStatus(viewerId, tokens?.accessToken);
        setRouletteUsed(status.claimed_today);
        if (status.reward) setRouletteResult(status.reward as RouletteReward);
      } catch {
        setRouletteUsed(true);
      }
    };
    loadStatus();
  }, [viewerId, user?.role, tokens?.accessToken]);

  const handleSpin = () => {
    if (!viewerId || user?.role !== "espectador") {
      setOverlayMessage("Solo los espectadores pueden usar la ruleta.");
      setShowSuccess(true);
      return;
    }
    if (rouletteUsed) return;

    api
      .claimRoulette(viewerId, tokens?.accessToken)
      .then((resp) => {
        const reward = resp.reward;
        const idx = rewardOptions.findIndex((r) => r.short === reward.short);
        const safeIdx = idx >= 0 ? idx : 0;
        const segmentAngle = 360 / rewardOptions.length;
        const targetAngle = 360 * 4 + segmentAngle * safeIdx + segmentAngle / 2;
        setSpinning(true);
        setSpinAngle(targetAngle);
        setRouletteUsed(true);

        setTimeout(() => {
          setSpinning(false);
          setRouletteResult(reward);
          if (reward.type === "coins") {
            setBalance((prev) =>
              typeof resp.saldo_coins === "number"
                ? resp.saldo_coins
                : typeof prev === "number"
                ? prev + reward.amount
                : reward.amount
            );
          }
          setOverlayMessage(`¡Felicidades! ${reward.label}`);
          setShowSuccess(true);
        }, 2500);
      })
      .catch(() => {
        setRouletteUsed(true);
        setOverlayMessage("Ya usaste la ruleta hoy o hubo un error.");
        setShowSuccess(true);
      });
  };

  return (
    <div className="tienda-container">
      <div className="tienda-header">
        <img src={capybaraMascot} alt="Mascota de la Tienda" className="tienda-mascot-img" />
        <div className="tienda-header-text">
          <h1 className="tienda-title">¡La Capibara-Tienda!</h1>
          <p className="tienda-subtitle">Recarga tus monedas conectando con el backend.</p>
          {balance !== null && (
            <p className="tienda-subtitle" style={{ color: "#fff", fontWeight: "bold" }}>
              Monedas disponibles: {balance} L
            </p>
          )}
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}
      {loading && <div className="empty-state">Cargando paquetes...</div>}

      <div className="packs-grid">
        {packs.map((pack) => (
          <div key={pack.id} className="pack-card" onClick={() => handleOpenModal(pack)}>
            <div className="pack-card-inner" style={{ background: "linear-gradient(135deg, #6B99FE 0%, #4B77F6 100%)" }}>
              <div className="shine-effect"></div>
              <img src={coinIcon} alt="Monedas" className="pack-icon" />
              <div className="pack-coins">{pack.coins.toLocaleString()}</div>
              <div className="pack-label">monedas</div>
              <div className="pack-price-button">
                Comprar por $ {Number(pack.precio).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="custom-purchase">
        <div className="custom-card">
          <div className="custom-title">Compra exacta</div>
          <p className="custom-subtitle">Elige la cantidad exacta de monedas.</p>
          <form className="custom-form" onSubmit={handleCustomPurchase}>
            <label htmlFor="custom-coins">Monedas a comprar</label>
            <input
              id="custom-coins"
              type="number"
              min={1}
              value={customCoins}
              onChange={(e) => setCustomCoins(Number(e.target.value))}
            />
            <div className="custom-price">
              Total: <span>$ {(Math.max(0, customCoins) * 0.04).toFixed(2)}</span>
            </div>
            <button type="submit" className="purchase-button">Comprar ahora</button>
          </form>
        </div>
      </div>

      {isModalOpen && selectedPack && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={handleCloseModal} className="modal-close-button">&times;</button>
            <h2>Confirmar Compra</h2>
            <p>Estás comprando <strong>{selectedPack.coins.toLocaleString()} monedas</strong> por <strong>$ {selectedPack.precio.toFixed(2)}</strong>.</p>
            
            <form onSubmit={handlePurchase} className="payment-form">
              <label htmlFor="card-name">Nombre en la tarjeta</label>
              <input id="card-name" type="text" placeholder="Juan Pérez" required />
              <label htmlFor="card-number">Número de tarjeta</label>
              <input id="card-number" type="text" placeholder="4242 4242 4242 4242" required />
              <div className="form-row">
                <div>
                  <label htmlFor="card-expiry">Expiración</label>
                  <input id="card-expiry" type="text" placeholder="MM/AA" required />
                </div>
                <div>
                  <label htmlFor="card-cvc">CVC</label>
                  <input id="card-cvc" type="text" placeholder="123" required />
                </div>
              </div>
              <button type="submit" className="purchase-button">Pagar Ahora</button>
            </form>
          </div>
        </div>
      )}

      {showSuccess && overlayMessage && (
        <OverlayNotification
          message={overlayMessage}
          onClose={() => { setShowSuccess(false); setOverlayMessage(null); }}
        />
      )}

      {/* Ruleta diaria para espectadores */}
      <div className="custom-purchase" style={{ marginTop: "24px" }}>
        <div className="custom-card" style={{ background: "rgba(17,24,39,0.7)" }}>
          <div className="custom-title">Ruleta diaria</div>
          <p className="custom-subtitle">Solo para espectadores, una vez al día.</p>
          <div className="roulette-wrapper">
            <div
              className={`roulette-wheel ${spinning ? "spinning" : ""}`}
              style={{ transform: `rotate(${spinAngle}deg)`, background: rouletteGradient }}
            >
              {rewardOptions.map((r, i) => {
                const angle = (360 / rewardOptions.length) * i + (360 / rewardOptions.length) / 2;
                return (
                  <div
                    key={i}
                    className="roulette-label"
                    style={{ transform: `rotate(${angle}deg) translate(0, -42%) rotate(${-angle}deg)` }}
                  >
                    <span>{r.short}</span>
                  </div>
                );
              })}
              <div className="roulette-center">
                {rouletteResult ? rouletteResult.label : "Gira"}
              </div>
            </div>
            <div className="roulette-pointer">▼</div>
          </div>
          {rouletteResult && (
            <div style={{ marginBottom: "10px", color: "#10b981", fontWeight: 700 }}>
              Último premio: {rouletteResult.label}
            </div>
          )}
          <div className="roulette-legend">
            {rewardOptions.map((r, idx) => (
              <span key={idx} className="legend-chip">
                {r.short} · {r.type === "coins" ? "monedas" : "puntos"}
              </span>
            ))}
          </div>
          <button
            className="purchase-button"
            onClick={handleSpin}
            disabled={rouletteUsed || user?.role !== "espectador"}
          >
            {rouletteUsed ? "Ya la usaste hoy" : "Girar ruleta"}
          </button>
          {user?.role !== "espectador" && (
            <p style={{ color: "#a1a1aa", marginTop: "8px" }}>Inicia sesión como espectador para usarla.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tienda;
