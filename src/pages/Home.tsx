import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import liveIcon from "../assets/live.png";
import perfil from "../assets/perfil.jpg";
import fallbackStreamImg from "../assets/stream1.jpg";
import categoriaImg from "../assets/categoria.png";
import streamsImg from "../assets/streams.png";
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
        setFeatured(liveOnly.slice(0, 1));
      } catch {
        setFeatured([]);
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

      <div className="static-banner">
        <img className="banner-img" src={categoriaImg} alt="Categoría destacada" />
      </div>

      <div className="static-banner">
        <img className="banner-img" src={streamsImg} alt="Streams sugeridos" />
      </div>
    </div>
  );
};

export default Home;
