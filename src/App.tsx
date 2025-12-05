import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import LoginModal from "./components/LoginModal";
import RegisterModal from "./components/RegisterModal";
import OverlayNotification from "./components/OverlayNotification";
// ✨ 1. Importamos el hook del contexto
import { useAuth } from "./app/auth"; 

function App() {
  // ✨ 2. USAMOS EL CONTEXTO EN LUGAR DE useState LOCAL
  // 'user' viene directamente del AuthProvider (verdad única)
  // 'logout', 'login', y 'register' también vienen de ahí.
  const { user, logout } = useAuth();

  // Estos estados visuales (modales) sí se quedan aquí porque son locales de la UI
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);

  // ❌ ELIMINAMOS useEffect y handlers manuales antiguos 
  // (Ya no necesitamos leer localStorage aquí manualmente)

  // Wrappers para conectar los modales con la lógica del AuthProvider
  const handleLoginSubmit = async () => {
    // userData viene de tu modal como objeto, pero tu auth.login espera (email, pass)
    // Asumiendo que tus modales ya llaman a la API, aquí solo cerramos
    // NOTA: Si tus modales llaman a useAuth() internamente, aquí solo necesitas cerrar los modales.
    setShowLogin(false);
    setOverlayMessage(`¡Bienvenido de nuevo!`);
  };
  
  const handleRegisterSubmit = async () => {
     setShowRegister(false);
     setOverlayMessage("¡Cuenta creada con éxito!");
  };

  const handleLogoutClick = () => {
    logout(); // Llama a la función del contexto
    setOverlayMessage("Sesión cerrada.");
  };

  return (
    <div className="app">
      <Header
        user={user} // Ahora este 'user' es el real del contexto
        onLogin={() => setShowLogin(true)}
        onRegister={() => setShowRegister(true)}
      />

      <div style={{ display: "flex", minHeight: "80vh" }}>
        {/* Le pasamos el usuario real y la función de logout real */}
        <Sidebar user={user} onLogout={handleLogoutClick} />
        
        <main style={{ flex: 1, padding: "10px" }}>
          <Outlet context={{ user }} /> {/* Pasamos user al outlet por si acaso */}
        </main>
      </div>

      <Footer />

      {/* Los modales reciben las funciones para cerrar el modal tras el éxito */}
      {showLogin && (
        <LoginModal 
           onClose={() => setShowLogin(false)} 
           onLogin={handleLoginSubmit} // Ojo: Revisa que LoginModal llame a login() internamente
        />
      )}
      {showRegister && (
        <RegisterModal 
           onClose={() => setShowRegister(false)} 
           onRegister={handleRegisterSubmit} 
        />
      )}
      
      {overlayMessage && (
        <OverlayNotification 
           message={overlayMessage} 
           onClose={() => setOverlayMessage(null)} 
        />
      )}
    </div>
  );
}

export default App;
