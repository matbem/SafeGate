import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { formatISO } from 'date-fns';
import { CheckCircle, XCircle, Loader2, Camera, QrCode, Search } from 'lucide-react'; // Dodano Search ikonę
import { api } from '../api';
import type { VerifyResponse } from '../types';

// ZAKTUALIZOWANE STANY: Dodano CHECKING_QR
type AppState = 'SCANNING' | 'CHECKING_QR' | 'PREPARING' | 'PROCESSING' | 'SUCCESS' | 'DENIED' | 'ERROR';

const UserPage: React.FC = () => {
  const [state, setState] = useState<AppState>('SCANNING');
  const [message, setMessage] = useState<string>('Zeskanuj kod QR');
  const [employeeName, setEmployeeName] = useState<string | null>(null); // Do personalizacji komunikatu
  
  const webcamRef = useRef<Webcam>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [capturedToken, setCapturedToken] = useState<string | null>(null);

  const resetToScanning = useCallback(() => {
    setState('SCANNING');
    setMessage('Zeskanuj kod QR');
    setCapturedToken(null);
    setEmployeeName(null);
  }, []);

  const scanFrame = useCallback(() => {
    if (state !== 'SCANNING') return;
    
    const video = webcamRef.current?.video;
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code && code.data) {
                // KROK 1: Wykryto kod -> Przechodzimy do sprawdzania w bazie
                verifyQrInDatabase(code.data);
            }
        }
    }
  }, [state]);

  // NOWA FUNKCJA: Sprawdza sam QR w bazie
  const verifyQrInDatabase = async (token: string) => {
      setState('CHECKING_QR');
      setMessage('Weryfikacja kodu...');
      setCapturedToken(token);

      try {
          const result = await api.checkQr(token);

          if (result.valid) {
              // QR JEST W BAZIE -> Przechodzimy do sekwencji twarzy
              setEmployeeName(result.employee_name || null);
              startFaceSequence(token, result.employee_name);
          } else {
              // QR BŁĘDNY -> Od razu błąd, bez skanowania twarzy
              setState('DENIED');
              setMessage(result.message || 'Niepoprawny kod QR');
              setTimeout(resetToScanning, 3000);
          }
      } catch (error) {
          console.error("QR Check error:", error);
          setState('ERROR'); // Błąd sieciowy
          setMessage('Błąd połączenia z serwerem');
          setTimeout(resetToScanning, 3000);
      }
  };

  const startFaceSequence = (token: string, name?: string) => {
      setState('PREPARING');
      // Personalizowany komunikat: "Cześć Szczepan! Spójrz w kamerę..."
      setMessage(name ? `Witaj ${name.split(' ')[0]}! Spójrz w kamerę...` : 'Kod poprawny. Spójrz w kamerę...');
      
      // Czekamy 1.5 sekundy na ustawienie twarzy
      setTimeout(() => {
          handleFaceVerification(token);
      }, 1500); 
  };

  const handleFaceVerification = async (qrToken: string) => {
    setState('PROCESSING');
    setMessage('Analiza biometryczna...');

    try {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) throw new Error('Błąd kamery');

        const payload = {
            qr_token: qrToken,
            image_base64: imageSrc,
            timestamp: formatISO(new Date())
        };

        const response: VerifyResponse = await api.verifyAccess(payload);

        if (response.access_granted) {
            setState('SUCCESS');
            setMessage(response.message || 'Dostęp przyznany!');
        } else {
            setState('DENIED');
            setMessage(response.message || 'Weryfikacja twarzy nieudana');
        }
        setTimeout(resetToScanning, 3000);

    } catch (error) {
        console.error("Biometrics error:", error);
        setState('ERROR');
        setMessage('Błąd weryfikacji');
        setTimeout(resetToScanning, 3000);
    }
  };

  useEffect(() => {
    if (state === 'SCANNING') {
        scanIntervalRef.current = setInterval(scanFrame, 100);
    } else {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    }
    return () => {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [state, scanFrame]);

  // --- UI RENDER ---
  if (state === 'SUCCESS') {
    return (
      <div className="h-screen w-screen bg-green-600 flex flex-col items-center justify-center text-white animate-in fade-in zoom-in duration-300">
        <div className="bg-white/20 p-8 rounded-full mb-8 backdrop-blur-sm">
             <CheckCircle size={120} className="text-white drop-shadow-md" />
        </div>
        <h1 className="text-5xl font-bold text-center drop-shadow-md">{message}</h1>
      </div>
    );
  }

  if (state === 'DENIED' || state === 'ERROR') {
    return (
      <div className="h-screen w-screen bg-red-600 flex flex-col items-center justify-center text-white animate-in slide-in-from-bottom-10 duration-300">
        <div className="bg-white/20 p-8 rounded-full mb-8 backdrop-blur-sm">
            <XCircle size={120} className="text-white drop-shadow-md" />
        </div>
        <h1 className="text-5xl font-bold text-center drop-shadow-md">{message}</h1>
      </div>
    );
  }

  // EKRAN GŁÓWNY (SCANNING, CHECKING_QR, PREPARING, PROCESSING)
  return (
      <div className="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden text-white">
        
        {/* Nagłówek Stanu */}
        <h2 className={`absolute top-10 text-2xl md:text-3xl font-bold z-20 drop-shadow-md text-center px-4 transition-colors duration-300 ${
            state === 'CHECKING_QR' ? 'text-purple-400' :
            state === 'PREPARING' ? 'text-yellow-400' : 
            state === 'PROCESSING' ? 'text-blue-400' : 'text-white'
        }`}>
            {state === 'CHECKING_QR' && <Loader2 className="inline animate-spin mr-2" />}
            {state === 'PROCESSING' && <Loader2 className="inline animate-spin mr-2" />}
            {state === 'PREPARING' && <Camera className="inline animate-pulse mr-2" />}
            {message}
        </h2>

        {/* Podgląd Wideo */}
        <div className={`relative w-full max-w-2xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border transition-all duration-500 ${
            state === 'CHECKING_QR' ? 'border-purple-500 opacity-80' :
            state === 'PREPARING' ? 'border-yellow-500 scale-105 shadow-[0_0_50px_rgba(234,179,8,0.3)]' : 
            state === 'PROCESSING' ? 'border-blue-500 opacity-80' : 
            'border-gray-700'
        }`}>
            <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className="w-full h-full object-cover"
                audio={false}
            />

            <div className="absolute inset-0 border-[50px] border-black/50 pointer-events-none hidden md:block"></div>

            {/* UI Skanowania */}
            {state === 'SCANNING' && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-80 md:h-80 border-2 border-blue-500/60 rounded-lg flex items-center justify-center shadow-[0_0_100px_rgba(59,130,246,0.2)]">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
                    <div className="w-full h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,1)] animate-scan-vertical opacity-80 absolute"></div>
                </div>
            )}

            {/* UI Sprawdzania bazy (NOWE) */}
            {state === 'CHECKING_QR' && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in">
                     <div className="text-center">
                         <Search className="w-16 h-16 text-purple-400 mx-auto mb-2 animate-pulse" />
                         <p className="text-xl font-bold text-white drop-shadow-md">Szukam w bazie...</p>
                     </div>
                 </div>
            )}

            {/* UI Przygotowania */}
            {state === 'PREPARING' && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in">
                     <div className="text-center">
                         <QrCode className="w-16 h-16 text-green-400 mx-auto mb-2" />
                         <p className="text-xl font-bold text-white drop-shadow-md">
                             {employeeName ? `Cześć ${employeeName.split(' ')[0]}!` : 'Kod OK'}
                         </p>
                         <p className="text-sm text-gray-200">Teraz weryfikacja twarzy</p>
                     </div>
                 </div>
            )}
        </div>

        <p className="mt-8 text-gray-400 flex items-center gap-2">
            {state === 'SCANNING' ? 'Umieść kod QR w ramce' : 'Proszę czekać...'}
        </p>
        
        <style>{`
            @keyframes scan-vertical {
                0% { top: 10%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 90%; opacity: 0; }
            }
            .animate-scan-vertical {
                animation: scan-vertical 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
        `}</style>
      </div>
  );
};

export default UserPage;