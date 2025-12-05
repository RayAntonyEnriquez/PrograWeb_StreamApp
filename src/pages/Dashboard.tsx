import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css";
import OverlayNotification from "../components/OverlayNotification";
import { FaBolt, FaRegClock, FaWalking, FaSave, FaUserPlus, FaStar, FaGift } from "react-icons/fa";
import { api, type StreamerProgress, type ViewerRule } from "../services/api";
import { useAuth } from "../app/auth";

type ActivityItem = { tipo: string; descripcion: string };

const Dashboard = () => {
  const { user, tokens } = useAuth();
  const streamerId = useMemo(() => user?.perfilId ?? Number(import.meta.env.VITE_DEFAULT_STREAMER_ID ?? 0), [user?.perfilId]);
  const [progress, setProgress] = useState<StreamerProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [viewerRules, setViewerRules] = useState<ViewerRule[]>([]);
  const [savingRuleId, setSavingRuleId] = useState<number | null>(null);
  const navigate = useNavigate();
  const activeStreamId = null;

  const fetchData = async () => {
    if (!streamerId) return;
    setError(null);
    try {
      const [prog, acts, rules] = await Promise.all([
        api.getStreamerProgreso(streamerId, tokens?.accessToken),
        api.getStreamerActividad(streamerId, 10, tokens?.accessToken),
        api.listViewerRules(tokens?.accessToken),
      ]);
      setProgress(prog);
      setActivities(acts?.items ?? []);
      setViewerRules(rules ?? []);
    } catch (err: any) {
      setError("No se pudo cargar el dashboard. Verifica el backend o el usuario.");
    }
  };

  useEffect(() => { fetchData(); }, [streamerId, tokens?.accessToken]);

  const handleGoLive = () => navigate("/stream-setup");

  if (!user || user.role !== "streamer") {
    return <div className={styles.dashboardPage}>Inicia sesion como streamer para ver tu panel.</div>;
  }

  const level = progress?.nivel_actual ?? 1;
  const horas = progress?.horas_totales ?? 0;
  const siguiente = progress?.siguiente_nivel ?? null;
  const horasReq = progress?.horas_requeridas ?? null;
  const faltaHoras =
    progress?.falta_horas !== undefined && progress?.falta_horas !== null
      ? progress.falta_horas
      : horasReq !== null
      ? Math.max(horasReq - horas, 0)
      : 0;
  const pct =
    progress?.progreso_porcentaje !== undefined && progress?.progreso_porcentaje !== null
      ? progress.progreso_porcentaje
      : horasReq
      ? Math.min(100, Number(((horas / horasReq) * 100).toFixed(2)))
      : 0;

  const handleRuleChange = (id: number, value: number) => {
    setViewerRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, puntos_requeridos: value } : r))
    );
  };

  const handleSaveRule = async (id: number, puntos: number) => {
    try {
      setSavingRuleId(id);
      const updated = await api.updateViewerRule(id, { puntos_requeridos: puntos }, tokens?.accessToken);
      setViewerRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      setError("No se pudo guardar la regla de nivel.");
    } finally {
      setSavingRuleId(null);
    }
  };

  return (
    <div className={styles.dashboardPage}>
      <div className={styles.mainWidget}>
        <div className={styles.streamStatusPanel}>
          <div className={styles.statusHeader}>
            <span className={`${styles.statusIndicator} ${activeStreamId ? styles.online : styles.offline}`}></span>
            {activeStreamId ? "STREAMING ONLINE" : "STREAM OFFLINE"}
          </div>
          <button onClick={handleGoLive} className={`${styles.streamButton} ${styles.start}`}>
            Ir a configurar stream
          </button>
          <div className={styles.streamStats}>
            <div className={styles.statItem}>
              <span>Horas Totales</span>
              <strong>{horas.toFixed(1)}h</strong>
            </div>
            <div className={styles.statItem}>
              <span>Nivel de Streamer</span>
              <strong>{level}</strong>
            </div>
          </div>
          <div className={styles.progressBarContainer}>
            <div className={styles.progressBarFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.progressLabels}>
            <span>{horas.toFixed(1)}h acumuladas</span>
            <span>{faltaHoras}h para nivel {siguiente ?? level + 1}</span>
          </div>
        </div>
        <div className={styles.activityFeed}>
          <h3 className={styles.feedTitle}>Actividad Reciente</h3>
          <ul className={styles.feedList}>
            {activities.length === 0 && <li className={styles.feedItem}>Sin actividad reciente.</li>}
            {activities.map((item, index) => (
              <li key={index} className={styles.feedItem}>
                <span className={styles.feedIcon}>
                  {item.tipo === "follow" && <FaUserPlus />}
                  {item.tipo === "gift" && <FaGift />}
                  {item.tipo !== "follow" && item.tipo !== "gift" && <FaStar />}
                </span>
                {item.descripcion}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.configWidget}>
        <div className={styles.widgetHeader}>
          <h2 className={styles.widgetTitle}>Progreso de horas</h2>
          <p className={styles.widgetSubtitle}>Datos provenientes del backend.</p>
        </div>
        <div className={styles.configGrid}>
          <div className={styles.controls}>
            <h3>Ritmo</h3>
            <div className={styles.presetButtons}>
              <button disabled><FaBolt /> Rapida</button>
              <button disabled><FaWalking /> Normal</button>
              <button disabled><FaRegClock /> Lenta</button>
            </div>
            <h3>Reglas (solo lectura)</h3>
            <p style={{ color: "#bbb" }}>La configuracion de niveles vive en el backend.</p>
            <button className={styles.saveButton} disabled>
              <FaSave /> Guardado por API
            </button>
          </div>
          <div className={styles.visualization}>
            <h3>Curva aproximada</h3>
            <div className={styles.chartContainer}>
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className={styles.chartBarWrapper}>
                  <div className={styles.chartBar} style={{ height: `${Math.max(10, Math.min(100, pct))}%` }}>
                    <span className={styles.barValue}>{pct}%</span>
                  </div>
                  <span className={styles.chartLabel}>Nvl {level + idx}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {error && <div className={styles.errorText}>{error}</div>}
      </div>

      <div className={styles.configWidget}>
        <div className={styles.widgetHeader}>
          <h2 className={styles.widgetTitle}>Reglas de nivel (espectadores)</h2>
          <p className={styles.widgetSubtitle}>Ajusta los puntos requeridos por nivel.</p>
        </div>
        <div className={styles.rulesTable}>
          <div className={styles.rulesHeader}>
            <span>Nivel</span>
            <span>Puntos requeridos</span>
            <span>Recompensa (coins)</span>
            <span></span>
          </div>
          {viewerRules.length === 0 && <div className={styles.emptyRules}>No hay reglas cargadas.</div>}
          {viewerRules.map((rule) => (
            <div key={rule.id} className={styles.rulesRow}>
              <span>Nvl {rule.nivel}</span>
              <input
                type="number"
                min={1}
                className={styles.ruleInput}
                value={rule.puntos_requeridos}
                onChange={(e) => handleRuleChange(rule.id, Number(e.target.value))}
              />
              <span>{rule.recompensa_coins} coins</span>
              <button
                className={styles.saveButton}
                onClick={() => handleSaveRule(rule.id, rule.puntos_requeridos)}
                disabled={savingRuleId === rule.id}
              >
                Guardar
              </button>
            </div>
          ))}
          {error && <div className={styles.errorText}>{error}</div>}
        </div>
      </div>

      {showLevelUp && (
        <OverlayNotification
          message={`Felicidades! Has alcanzado el nivel ${level}.`}
          onClose={() => setShowLevelUp(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
