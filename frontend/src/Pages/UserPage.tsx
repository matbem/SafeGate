// frontend/src/pages/UserPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { ScanLine, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../api';
import { formatISO } from 'date-fns';
import type {VerifyResponse} from '../types';

type AppState = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'DENIED' | 'ERROR';

const UserPage: React.FC = () => {
  const [state, setState] = useState<AppState>('IDLE');
  const [message, setMessage] = useState<string>('Zeskanuj kod QR, aby wejść');
  const [qrBuffer, setQrBuffer] = useState<string>('');
  const webcamRef = useRef<Webcam>(null);

  const resetToIdle = useCallback(() => {
    setState('IDLE');
    setMessage('Zeskanuj kod QR, aby wejść');
    setQrBuffer('');
  }, []);

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
        if (!imageSrc) throw new Error('Nie udało się pobrać obrazu z kamery');

        // Payload zgodny z access.py
        const payload = {
          qr_token: token,
          image_base64: imageSrc,
          timestamp: formatISO(new Date())
        };

        const response: VerifyResponse = await api.verifyAccess(payload);

        if (response.access_granted) {
          setState('SUCCESS');
          setMessage(response.message || 'Witaj!');
          setTimeout(resetToIdle, 3000);
        } else {
          setState('DENIED');
          setMessage('Odmowa dostępu');
          setTimeout(resetToIdle, 3000);
        }
      } catch (error) {
        console.error(error);
        setState('ERROR');
        setMessage('Błąd systemu.');
        setTimeout(resetToIdle, 3000);
      }
    }, 1500);
  };

  // --- Renderowanie (identyczne jak wcześniej) ---
  if (state === 'IDLE') {
    return (
      <div className="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <div className="absolute opacity-0 pointer-events-none">
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" width={720} videoConstraints={{ facingMode: "user" }} />
        </div>
        <ScanLine size={120} className="animate-pulse mb-8 text-blue-400" />
        <h1 className="text-5xl font-bold mb-4 text-center">{message}</h1>
        <p className="text-gray-400 mt-4">Przyłóż przepustkę do czytnika</p>
        <button onClick={() => handleVerification("550e8400-e29b-41d4-a716-446655440000")} className="absolute bottom-10 bg-gray-800 text-xs px-4 py-2 rounded text-gray-500 hover:text-white">
          [DEBUG] Symuluj skan QR
        </button>
      </div>
    );
  }

  if (state === 'PROCESSING') {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative">
        <h2 className="absolute top-10 text-3xl text-white font-semibold z-10 drop-shadow-md">{message}</h2>
        <div className="relative border-4 border-blue-500 rounded-lg overflow-hidden shadow-2xl">
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" width={1280} height={720} videoConstraints={{ facingMode: "user" }} className="block" />
          <div className="absolute inset-0 border-2 border-white/30 rounded-lg m-12">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
               <Loader2 size={64} className="animate-spin text-blue-500" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'SUCCESS') {
    return (
      <div className="h-screen w-screen bg-green-600 flex flex-col items-center justify-center text-white">
        <CheckCircle size={180} className="mb-8 drop-shadow-lg" />
        <h1 className="text-6xl font-bold text-center drop-shadow-md">{message}</h1>
        <p className="text-2xl mt-4 opacity-90">Drzwi otwarte</p>
      </div>
    );
  }

  if (state === 'DENIED' || state === 'ERROR') {
    return (
      <div className="h-screen w-screen bg-red-600 flex flex-col items-center justify-center text-white">
        <XCircle size={180} className="mb-8 drop-shadow-lg" />
        <h1 className="text-6xl font-bold text-center drop-shadow-md">{message}</h1>
        <p className="text-2xl mt-4 opacity-90">Brak autoryzacji</p>
      </div>
    );
  }

  return null;
};

export default UserPage;