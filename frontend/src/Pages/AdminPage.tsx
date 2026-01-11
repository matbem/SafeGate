// frontend/src/pages/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type {User, AccessLog} from '../types';
import { LogOut, Users, FileText, CheckCircle, XCircle } from 'lucide-react';

const AdminPage: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // Stany logowania
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Stany panelu
  const [activeTab, setActiveTab] = useState<'LOGS' | 'USERS'>('LOGS');
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Logowanie
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.login(username, password);
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      fetchData(); // Pobierz dane od razu po zalogowaniu
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      alert('Błąd logowania');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // Pobieranie danych z backendu
  const fetchData = async () => {
    try {
      const logsData = await api.getLogs();
      setLogs(logsData);
      const usersData = await api.getUsers();
      setUsers(usersData);
    } catch (err) {
      console.error("Błąd pobierania danych", err);
    }
  };

  // Jeśli jest token, pobierz dane przy wejściu
  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  // --- Widok Logowania ---
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
          <h1 className="text-2xl mb-4 font-bold">Admin Login</h1>
          <input className="w-full border p-2 mb-4" placeholder="Email/Login" value={username} onChange={e => setUsername(e.target.value)} />
          <input className="w-full border p-2 mb-4" type="password" placeholder="Hasło" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-blue-600 text-white p-2 rounded">Zaloguj</button>
        </form>
      </div>
    );
  }

  // --- Panel Administratora ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Pasek boczny / Menu */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">SafeGate Admin</h1>
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('LOGS')} className={`flex items-center gap-2 ${activeTab === 'LOGS' ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>
            <FileText size={18} /> Logi Dostępu
          </button>
          <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-2 ${activeTab === 'USERS' ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>
            <Users size={18} /> Użytkownicy
          </button>
        </div>
        <button onClick={handleLogout} className="text-red-500 flex items-center gap-2"><LogOut size={18}/> Wyloguj</button>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        {activeTab === 'LOGS' && (
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-lg font-bold mb-4">Historia Weryfikacji</h2>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="p-3">Czas</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Pewność (0-1)</th>
                  <th className="p-3">Metoda</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3">
                      {log.access_granted
                        ? <span className="text-green-600 flex items-center gap-1"><CheckCircle size={16}/> Przyznano</span>
                        : <span className="text-red-600 flex items-center gap-1"><XCircle size={16}/> Odmowa</span>}
                    </td>
                    <td className="p-3">{log.confidence_score ? log.confidence_score.toFixed(2) : '-'}</td>
                    <td className="p-3 text-gray-500 text-sm">{log.verification_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'USERS' && (
          <div className="bg-white rounded shadow p-6">
            <div className="flex justify-between mb-4">
                <h2 className="text-lg font-bold">Użytkownicy Systemu</h2>
                {/* Tu można dodać przycisk "Dodaj użytkownika", który otworzy modal z formularzem do api.createUser */}
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="p-3">ID</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Imię i Nazwisko</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Rola</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{user.id}</td>
                    <td className="p-3 font-medium">{user.email}</td>
                    <td className="p-3">{user.full_name || '-'}</td>
                    <td className="p-3">
                      {user.is_active
                        ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Aktywny</span>
                        : <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">Nieaktywny</span>}
                    </td>
                    <td className="p-3">
                         {user.is_superuser
                        ? <span className="text-purple-600 font-bold text-sm">Admin</span>
                        : <span className="text-gray-600 text-sm">Pracownik</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;