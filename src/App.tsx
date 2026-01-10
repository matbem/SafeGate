import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { ScanLine, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from './api';
import { formatISO } from 'date-fns';

// Definicja stanów aplikacji
type AppState = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'DENIED' | 'ERROR';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('IDLE');
  const [message, setMessage] = useState<string>('Zeskanuj kod QR, aby wejść');
  const [qrBuffer, setQrBuffer] = useState<string>('');

  const webcamRef = useRef<Webcam>(null);

  // Funkcja resetująca stan do IDLE
  const resetToIdle = useCallback(() => {
    setState('IDLE');
    setMessage('Zeskanuj kod QR, aby wejść'); // [cite: 250]
    setQrBuffer('');
  }, []);

  // Logika obsługi skanera QR (emulacja klawiatury)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (state !== 'IDLE') return;

      // Jeśli wciśnięto Enter, uznajemy kod za wprowadzony
      if (event.key === 'Enter') {
        if (qrBuffer.length > 0) {
          handleVerification(qrBuffer);
        }
        setQrBuffer('');
      } else {
        // Ignorujemy klawisze funkcyjne, zbieramy znaki
        if (event.key.length === 1) {
          setQrBuffer(prev => prev + event.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, qrBuffer]);

  // Główna logika weryfikacji
  const handleVerification = async (token: string) => {
    setState('PROCESSING');
    setMessage('Proszę spojrzeć w kamerę...'); // [cite: 257]

    // Krótkie opóźnienie, aby kamera zdążyła się "rozgrzać" i user spojrzał w obiektyw
    setTimeout(async () => {
      try {
        const imageSrc = webcamRef.current?.getScreenshot();

        if (!imageSrc) {
          throw new Error('Nie udało się pobrać obrazu z kamery');
        }

        // Przygotowanie payloadu zgodnie z [cite: 98]
        const payload = {
          qr_token: token,
          image_base64: imageSrc,
          timestamp: formatISO(new Date())
        };

        // Wywołanie API
        const response = await api.verifyAccess(payload);

        if (response.access_granted) {
          setState('SUCCESS');
          setMessage(response.message || 'Witaj!'); // [cite: 264]
          // Powrót do IDLE po 3-5 sekundach [cite: 265]
          setTimeout(resetToIdle, 3000);
        } else {
          setState('DENIED');
          setMessage('Odmowa dostępu'); // [cite: 269]
          // Powrót do IDLE po 3 sekundach
          setTimeout(resetToIdle, 3000);
        }

      } catch (error) {
        console.error(error);
        setState('ERROR'); // Awaria/Błąd techniczny
        setMessage('Błąd systemu. Spróbuj ponownie.');
        setTimeout(resetToIdle, 3000);
      }
    }, 1500); // Czas na ustawienie twarzy
  };

  // --- Renderowanie Widoków ---

  // 1. Stan Spoczynku (Idle) [cite: 248]
  if (state === 'IDLE') {
    return (
      <div className="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        {/* Ukryta kamera w tle (aby była gotowa) */}
        <div className="absolute opacity-0 pointer-events-none">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={720}
            videoConstraints={{ facingMode: "user" }}
          />
        </div>

        <ScanLine size={120} className="animate-pulse mb-8 text-blue-400" />
        <h1 className="text-5xl font-bold mb-4 text-center">{message}</h1>
        <p className="text-gray-400 mt-4">Przyłóż przepustkę do czytnika</p>

        {/* Przycisk DEBUGOWANIA (tylko jeśli nie masz fizycznego skanera) */}
        <button
          onClick={() => handleVerification("550e8400-e29b-41d4-a716-446655440000")}
          className="absolute bottom-10 bg-gray-800 text-xs px-4 py-2 rounded text-gray-500 hover:text-white"
        >
          [DEBUG] Symuluj skan QR
        </button>
      </div>
    );
  }

  // 2. Stan Przetwarzania (Processing) [cite: 254]
  if (state === 'PROCESSING') {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative">
        <h2 className="absolute top-10 text-3xl text-white font-semibold z-10 drop-shadow-md">
          {message}
        </h2>

        <div className="relative border-4 border-blue-500 rounded-lg overflow-hidden shadow-2xl">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={1280}
            height={720}
            videoConstraints={{ facingMode: "user" }}
            className="block"
          />
          {/* Ramka szukająca twarzy (wizualna) [cite: 256] */}
          <div className="absolute inset-0 border-2 border-white/30 rounded-lg m-12">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
               <Loader2 size={64} className="animate-spin text-blue-500" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Stan Sukcesu (Access Granted) [cite: 259]
  if (state === 'SUCCESS') {
    return (
      <div className="h-screen w-screen bg-safegate-green flex flex-col items-center justify-center text-white">
        <CheckCircle size={180} className="mb-8 drop-shadow-lg" />
        <h1 className="text-6xl font-bold text-center drop-shadow-md">{message}</h1>
        <p className="text-2xl mt-4 opacity-90">Drzwi otwarte</p>
      </div>
    );
  }

  // 4. Stan Odmowy (Access Denied) [cite: 266]
  if (state === 'DENIED' || state === 'ERROR') {
    return (
      <div className="h-screen w-screen bg-safegate-red flex flex-col items-center justify-center text-white">
        <XCircle size={180} className="mb-8 drop-shadow-lg" />
        <h1 className="text-6xl font-bold text-center drop-shadow-md">{message}</h1>
        <p className="text-2xl mt-4 opacity-90">Brak autoryzacji</p>
      </div>
    );
  }

  return null;
};

export default App;