import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import liveIcon from "../assets/live.png";
import perfil from "../assets/perfil.jpg";
import fallbackStreamImg from "../assets/stream1.jpg";
import { request } from "../services/http";

type Stream = {
  id: number;
  titulo: string;
  streamer: string;
  estado?: string;
  viewers: number;
  imagen: string | null;
  room?: string | null;
  streamerId?: number | null;
};

const Home: React.FC = () => {
  const [featured, setFeatured] = useState<Stream[]>([]);
  const [recomendados, setRecomendados] = useState<Stream[]>([]);
  const [conversando, setConversando] = useState<Stream[]>([]);
  const [juegos, setJuegos] = useState<Stream[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStreams = async () => {
      setLoading(true);
      try {
        const endpoint = import.meta.env.VITE_HOME_STREAMS_ENDPOINT || "/api/streams";
        const data = await request<Stream[]>(endpoint);
        const liveOnly = data
          .filter((d: any) => !d.estado || d.estado === "en_vivo")
          .map((d: any) => ({
            ...d,
            streamerId: d.streamer_id ?? d.streamerId ?? null,
            room: d.room ?? d.canal_slug ?? null,
          }));
        const setSection = (list: Stream[]) => {
          setFeatured(list.slice(0, 1));
          setRecomendados(list.slice(1, 5));
          setConversando(list.slice(5, 9));
          setJuegos(list.slice(9, 13));
        };
        setSection(liveOnly);
      } catch {
        setFeatured([]);
        setRecomendados([]);
        setConversando([]);
        setJuegos([]);
      } finally {
        setLoading(false);
      }
    };
    loadStreams();
  }, []);

  const irAVer = (stream: Stream) => {
    // Usar el mismo esquema de room/scene que stream-setup y VDO Ninja
    const room = `stream${stream.id}`;
    const scene = encodeURIComponent(`https://vdo.ninja/?scene&room=${room}`);
    const streamerParam = stream.streamerId ? `&streamerId=${stream.streamerId}` : "";
    navigate(`/watch/${room}?streamId=${stream.id}&scene=${scene}${streamerParam}`);
  };

  const prevFeatured = () => {
    setFeaturedIndex((prev) => (prev === 0 ? Math.max(featured.length - 1, 0) : prev - 1));
  };

  const nextFeatured = () => {
    setFeaturedIndex((prev) => (prev === featured.length - 1 ? 0 : prev + 1));
  };

  const renderMiniStreams = (streams: Stream[]) => {
    if (!streams.length) {
      return <div className="empty-streams">Sin streams: conecta el backend para poblar esta secciA3n.</div>;
    }
    return streams.map((s) => (
      <div
        key={s.id}
        className="mini-stream-card"
        onClick={() => irAVer(s)}
        style={{ cursor: "pointer" }}
      >
        <img className="mini-stream-img" src={s.imagen || fallbackStreamImg} alt={s.titulo} />
        <img className="live-logo" src={liveIcon} alt="live" />
        <div className="mini-bottom">
          <img className="mini-perfil-logo" src={perfil} alt="perfil" />
          <span className="mini-stream-title">{s.titulo}</span>
        </div>
        <div className="mini-viewers">{s.viewers ?? 0} viewers</div>
      </div>
    ));
  };

  const featuredStream = featured[featuredIndex];

  return (
    <div className="home-container">
      {loading && <div className="empty-featured">Cargando streams en vivo...</div>}
      {!loading && featuredStream ? (
        <div
          className="featured-stream"
          onClick={() => irAVer(featuredStream)}
          style={{ cursor: "pointer" }}
        >
          <img className="featured-img" src={featuredStream.imagen || fallbackStreamImg} alt={featuredStream.titulo} />
          <img className="live-logo" src={liveIcon} alt="live" />
          <div className="featured-bottom">
            <img className="perfil-logo" src={perfil} alt="perfil" />
            <span className="stream-title">{featuredStream.titulo}</span>
          </div>
          <div className="featured-viewers">{featuredStream.viewers ?? 0} viewers</div>

          {featured.length > 1 && (
            <>
              <button className="carousel-arrow left" onClick={(e) => { e.stopPropagation(); prevFeatured(); }}>&lt;</button>
              <button className="carousel-arrow right" onClick={(e) => { e.stopPropagation(); nextFeatured(); }}>&gt;</button>
            </>
          )}
        </div>
      ) : (
        !loading && <div className="empty-featured">No hay streams en vivo ahora mismo.</div>
      )}

      {recomendados.length > 0 && (
        <>
          <div className="mini-section">
            <h3 className="section-title">Recomendados</h3>
            <div className="mini-streams">{renderMiniStreams(recomendados)}</div>
          </div>
          <hr className="section-divider" />
        </>
      )}

      {conversando.length > 0 && (
        <>
          <div className="mini-section">
            <h3 className="section-title">Conversando</h3>
            <div className="mini-streams">{renderMiniStreams(conversando)}</div>
          </div>
          <hr className="section-divider" />
        </>
      )}

      {juegos.length > 0 && (
        <div className="mini-section">
          <h3 className="section-title">Juegos</h3>
          <div className="mini-streams">{renderMiniStreams(juegos)}</div>
        </div>
      )}
    </div>
  );
};

export default Home;
