import React from "react";
import { useNavigate } from "react-router-dom";
import inicio from "../assets/inicio.png";
import nosotros from "../assets/nosotros.png";
import tienda from "../assets/tienda.png";
import terminos from "../assets/terminos.png";
import canales from "../assets/canales.png";
import "./Sidebar.css";

interface SidebarProps {
  user: any;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const goTo = (path: string) => navigate(path);

  return (
    <aside className="sidebar">
      <ul>
        <li onClick={() => goTo("/")}>
          <img src={inicio} alt="inicio" />
          <span>Inicio</span>
        </li>
        <li onClick={() => goTo("/perfil")}>
          <img src={inicio} alt="perfil" />
          <span>Perfil</span>
        </li>

        {user?.role !== "streamer" && (
          <li onClick={() => goTo("/tienda")}>
            <img src={tienda} alt="tienda" />
            <span>Tienda</span>
          </li>
        )}
        {user?.role === "streamer" && (
          <li onClick={() => goTo("/gifts")}>
            <img src={tienda} alt="regalos" /> 
            <span>Regalos</span>
          </li>
        )}
        {user?.role === "streamer" && (
          <li onClick={() => goTo("/stream-setup")}>
            <img src={tienda} alt="stream" />
            <span>Configurar Stream</span>
          </li>
        )}

        <li onClick={() => goTo("/nosotros")}>
          <img src={nosotros} alt="nosotros" />
          <span>Nosotros</span>
        </li>
        <li onClick={() => goTo("/tyc")}>
          <img src={terminos} alt="tyc" />
          <span>T & C</span>
        </li>

        {user && (
          <li
            onClick={() => { onLogout(); goTo("/"); }}
            style={{ marginTop: "20px", cursor: "pointer", color: "#ff5757", fontWeight: "bold" }}
          >
            Cerrar sesión
          </li>
        )}
      </ul>

      <hr className="divider" />

      <div className="recommendations">
        <h4>Recomendaciones</h4>
        <img
          src={canales}
          alt="Canales recomendados"
          className="recommendation-banner"
        />
        <p className="mini-stream-name">Se cargarán desde el backend.</p>
      </div>
    </aside>
  );
};

export default Sidebar;
