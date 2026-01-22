import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import UserPage from './Pages/UserPage';
import AdminPage from './Pages/AdminPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ścieżka główna "/" -> Widok Użytkownika (Kiosk) */}
        <Route path="/" element={<UserPage />} />

        {/* Ścieżka "/admin" -> Widok Administratora */}
        <Route path="/admin" element={<AdminPage />} />

        {/* Przekierowanie nieznanych adresów na stronę główną */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;