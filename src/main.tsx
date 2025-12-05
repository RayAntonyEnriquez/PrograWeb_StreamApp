
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./app/auth";
import { RequireRole } from "./app/guards";

import Home from "./pages/Home";
import Nosotros from "./pages/Nosotros";
import TyC from "./pages/TyC";
import Tienda from "./pages/Tienda";
import Perfil from "./pages/Perfil";
import Dashboard from "./pages/Dashboard";
import Feed from "./pages/Feed";
import Gifts from "./pages/Gifts";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StreamPage from "./pages/Stream/StreamPage";
import StreamSetup from "./pages/StreamSetup";
import StreamViewer from "./pages/StreamViewer";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/live/:channel" element={<StreamPage />} />
          <Route element={<App />}>
            <Route index element={<Home />} />
            <Route path="nosotros" element={<Nosotros />} />
            <Route path="tyc" element={<TyC />} />
            <Route path="tienda" element={<Tienda />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="stream-setup" element={
              <RequireRole role="streamer">
                <StreamSetup />
              </RequireRole>
            } />
            <Route path="watch/:room" element={<StreamViewer />} />
            <Route path="feed" element={<Feed />} />
            <Route
              path="gifts"
              element={
                <RequireRole role="streamer">
                  <Gifts />
                </RequireRole>
              }
            />
          </Route>
          <Route path="/login" element={<App />} >
            <Route index element={<Login />} />
          </Route>
          <Route path="/register" element={<App />} >
            <Route index element={<Register />} />
          </Route>
          <Route element={<App />}>
            <Route index element={<Home />} />
            <Route path="nosotros" element={<Nosotros />} />
            <Route path="tyc" element={<TyC />} />
            <Route path="tienda" element={<Tienda />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route
              path="stream-setup"
              element={
                <RequireRole role="streamer">
                  <StreamSetup />
                </RequireRole>
              }
            />
            <Route path="feed" element={<Feed />} />
            <Route
              path="gifts"
              element={
                <RequireRole role="streamer">
                  <Gifts />
                </RequireRole>
              }
            />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  </React.StrictMode>
);
