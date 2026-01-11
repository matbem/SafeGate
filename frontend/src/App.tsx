import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { ScanLine, CheckCircle, XCircle, Loader2, Settings } from 'lucide-react'; // Dodano Settings
import { api } from './api';
import { formatISO } from 'date-fns';
import type {LogEntry} from './types'; // Zaimportuj typ LogEntry


// 1. Zaktualizowana definicja stanów (dodano ADMIN)
type AppState = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'DENIED' | 'ERROR' | 'ADMIN';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('IDLE');
  const [message, setMessage] = useState<string>('Zeskanuj kod QR, aby wejść');
  const [qrBuffer, setQrBuffer] = useState<string>('');

  // 2. Nowy stan dla logów administratora
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const webcamRef = useRef<Webcam>(null);

  const resetToIdle = useCallback(() => {
    setState('IDLE');
    setMessage('Zeskanuj kod QR, aby wejść');
    setQrBuffer('');
  }, []);

  // 3. Funkcja pobierająca logi i zmieniająca widok
  const openAdminPanel = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const response = await api.getLogs(today.toISOString());
      if (response.success) {
        setLogs(response.logs);
        setState('ADMIN');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      alert("Błąd połączenia z panelem admina");
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (state !== 'IDLE') return;
      if (event.key === 'Enter') {
        if (qrBuffer.length > 0) handleVerification(qrBuffer);
        setQrBuffer('');
      } else if (event.key.length === 1) {
        setQrBuffer(prev => prev + event.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, qrBuffer]);

  const handleVerification = async (token: string) => {
    setState('PROCESSING');
    setMessage('Proszę spojrzeć w kamerę...');

    setTimeout(async () => {
      try {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) throw new Error('Błąd kamery');

        const payload = {
          qr_token: token,
          image_base64: imageSrc,
          timestamp: formatISO(new Date())
        };

        const response = await api.verifyAccess(payload);

        if (response.access_granted) {
          setState('SUCCESS');
          setMessage(response.message || 'Witaj!');
          setTimeout(resetToIdle, 3000);
        } else {
          setState('DENIED');
          setMessage('Odmowa dostępu');
          setTimeout(resetToIdle, 3000);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        setState('ERROR');
        setMessage('Błąd systemu');
        setTimeout(resetToIdle, 3000);
      }
    }, 1500);
  };

  // --- RENDEROWANIE ---

  // 4. Widok ADMIN (musi być przed pozostałymi returnami)
  if (state === 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Panel Administratora</h1>
            <button
              onClick={() => setState('IDLE')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Powrót do bramki
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">Logi z dzisiaj</h2>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">Data i godzina</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Informacja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {log.access_granted ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">Przyznano</span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">Odmowa</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.message || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 5. Zmodyfikowany widok IDLE (dodano przycisk zębatki)
  if (state === 'IDLE') {
    return (
      <div className="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        {/* Przycisk Panelu Admina (zębatka) */}
        <button
          onClick={openAdminPanel}
          className="absolute top-8 right-8 text-gray-500 hover:text-white transition"
          title="Panel administratora"
        >
          <Settings size={32} />
        </button>

        <div className="absolute opacity-0 pointer-events-none">
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
        </div>

        <ScanLine size={120} className="animate-pulse mb-8 text-blue-400" />
        <h1 className="text-5xl font-bold mb-4 text-center">{message}</h1>
        <p className="text-gray-400 mt-4">Przyłóż przepustkę do czytnika</p>

        {/* PRZYCISK DEBUG - Dodaj to poniżej: */}
        <button
          onClick={() => handleVerification("550e8400-e29b-41d4-a716-446655440000")}
          className="absolute bottom-10 bg-gray-800 text-xs px-4 py-2 rounded text-gray-500 hover:text-white transition"
        >
          [DEBUG] Symuluj skan QR
        </button>
      </div>
    );
  }
  // Pozostałe stany bez zmian...
  if (state === 'PROCESSING') {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative">
        <h2 className="absolute top-10 text-3xl text-white font-semibold z-10">{message}</h2>
        <div className="relative border-4 border-blue-500 rounded-lg overflow-hidden">
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" width={1280} height={720} />
          <div className="absolute inset-0 flex items-center justify-center">
             <Loader2 size={64} className="animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  if (state === 'SUCCESS') {
    return (
      <div className="h-screen w-screen bg-green-600 flex flex-col items-center justify-center text-white">
        <CheckCircle size={180} className="mb-8" />
        <h1 className="text-6xl font-bold">{message}</h1>
      </div>
    );
  }

  if (state === 'DENIED' || state === 'ERROR') {
    return (
      <div className="h-screen w-screen bg-red-600 flex flex-col items-center justify-center text-white">
        <XCircle size={180} className="mb-8" />
        <h1 className="text-6xl font-bold">{message}</h1>
      </div>
    );
  }

  return null;
};

export default App;