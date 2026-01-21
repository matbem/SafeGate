import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Employee, AccessLog } from '../types';
import { 
    LogOut, Users, FileText, Trash2, Plus, RefreshCw, 
    History, ShieldAlert, Upload, X, Download, QrCode, 
    Image as ImageIcon, AlertTriangle, CheckCircle 
} from 'lucide-react'; // Dodano AlertTriangle i CheckCircle
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Funkcja pomocnicza do tłumaczenia statusów
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'SUCCESS':
      return <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">Prawidłowe wejście</span>;
    case 'FACE_MISMATCH':
      return <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">Odmowa: Twarz niezgodna</span>;
    case 'NO_FACE':
      return <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">Odmowa: Brak twarzy</span>;
    case 'INVALID_QR':
      return <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700">Błędny kod QR</span>;
    case 'EXPIRED_QR':
      return <span className="px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-700">QR Wygasł</span>;
    default:
      return <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700">{status}</span>;
  }
};

const AdminPage: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'LOGS' | 'USERS'>('LOGS');
  
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [users, setUsers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [logSince, setLogSince] = useState(new Date(Date.now() - 86400000).toISOString().slice(0, 16));
  const [pruneDate, setPruneDate] = useState('');

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedQrUser, setSelectedQrUser] = useState<Employee | null>(null);
  const [selectedHistoryUser, setSelectedHistoryUser] = useState<Employee | null>(null);
  
  // --- NOWY STAN DLA MODALA REGENERACJI ---
  const [regenerateTarget, setRegenerateTarget] = useState<Employee | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const [viewImage, setViewImage] = useState<string | null>(null);

  const [historyLogs, setHistoryLogs] = useState<AccessLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- PDF STATES ---
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfFilters, setPdfFilters] = useState({
    userId: 'all',
    startDate: new Date(Date.now() - 86400000).toISOString().slice(0, 16),
    endDate: new Date().toISOString().slice(0, 16)
  });

  const [newUser, setNewUser] = useState<{ full_name: string; qr_valid_until: string; reference_photo_base64?: string }>({
    full_name: '',
    qr_valid_until: new Date(Date.now() + 31536000000).toISOString().slice(0, 16),
    reference_photo_base64: ''
  });

  useEffect(() => {
    if (token) fetchData();
  }, [token, activeTab]);

  useEffect(() => {
    if (isPdfModalOpen && users.length === 0) {
      api.getUsers().then(setUsers).catch(console.error);
    }
  }, [isPdfModalOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.login(username, password);
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
    } catch (err) {
      alert('Login failed. Check credentials.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'USERS') {
        const data = await api.getUsers();
        setUsers(data);
      } else {
        const fullIsoDate = new Date(logSince).toISOString();
        const data = await api.getLogs(fullIsoDate);
        setLogs(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewUser(prev => ({ ...prev, reference_photo_base64: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => setNewUser(prev => ({ ...prev, reference_photo_base64: '' }));

  const handleAddUser = async () => {
    try {
      const payload = {
        full_name: newUser.full_name,
        qr_valid_until: new Date(newUser.qr_valid_until).toISOString(),
        reference_photo_base64: newUser.reference_photo_base64 || undefined
      };
      await api.addUsers([payload]);
      setIsAddUserOpen(false);
      fetchData();
      setNewUser({
        full_name: '',
        qr_valid_until: new Date(Date.now() + 31536000000).toISOString().slice(0, 16),
        reference_photo_base64: ''
      });
    } catch (error) {
      console.error(error);
      alert('Failed to add user');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUsers([id]);
      fetchData();
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const handlePruneLogs = async () => {
    if (!pruneDate) return alert('Select a date first');
    if (!confirm(`Delete all logs older than ${pruneDate}?`)) return;
    try {
      const res = await api.pruneLogs(new Date(pruneDate).toISOString());
      alert(res.message);
      fetchData();
    } catch (error) {
      alert('Prune failed');
    }
  };

  const handleShowHistory = async (user: Employee) => {
    setSelectedHistoryUser(user);
    setHistoryLoading(true);
    setHistoryLogs([]); 
    try {
        const history = await api.getEmployeeHistory(user.id, 100);
        setHistoryLogs(history);
    } catch (error) {
        alert('Could not fetch history');
        setSelectedHistoryUser(null);
    } finally {
        setHistoryLoading(false);
    }
  };

  // --- LOGIKA REGENERACJI Z MODALEM ---
  
  // 1. Otwarcie modala (zamiast window.confirm)
  const openRegenerateModal = (user: Employee) => {
      setRegenerateTarget(user);
  };

  // 2. Wykonanie akcji po potwierdzeniu w modalu
  const confirmRegeneration = async () => {
    if (!regenerateTarget) return;
    
    setIsRegenerating(true);
    try {
        const result = await api.regenerateUserQR(regenerateTarget.id);
        
        if (result.success) {
            // Optimistic UI update - aktualizacja listy bez przeładowania
            setUsers(prevUsers => prevUsers.map(user => 
                user.id === regenerateTarget.id 
                ? { ...user, qr_token: result.new_qr_token, qr_valid_until: result.qr_valid_until } 
                : user
            ));
            
            // Zamknięcie modala
            setRegenerateTarget(null);
        }
    } catch (error) {
        console.error("Błąd regeneracji:", error);
        alert("Wystąpił błąd podczas generowania nowego kodu.");
    } finally {
        setIsRegenerating(false);
    }
  };

  const downloadQRFromModal = () => {
    const canvas = document.getElementById('qr-code-modal') as HTMLCanvasElement;
    if (canvas && selectedQrUser) {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `qr_${selectedQrUser.full_name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } else {
        alert("QR Code rendering error.");
    }
  };

  // --- PDF FONT LOADER ---
  const applyPolishFont = async (doc: jsPDF) => {
    try {
        const respReg = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf');
        const blobReg = await respReg.blob();
        
        const respBold = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf');
        const blobBold = await respBold.blob();

        const loadFont = (blob: Blob, name: string, style: string) => {
             return new Promise<void>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    doc.addFileToVFS(name, base64);
                    doc.addFont(name, 'Roboto', style);
                    resolve();
                };
                reader.readAsDataURL(blob);
             });
        };

        await Promise.all([
            loadFont(blobReg, 'Roboto-Regular.ttf', 'normal'),
            loadFont(blobBold, 'Roboto-Medium.ttf', 'bold')
        ]);

        doc.setFont('Roboto'); 
    } catch (error) {
        console.error("Nie udało się załadować polskiej czcionki.", error);
    }
  };

  // --- PDF GENERATION ---
  const generatePDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    await applyPolishFont(doc);

    doc.setFontSize(18);
    doc.setFont('Roboto', 'bold');
    doc.text('Raport logowania użytkowników', 14, 22);
    
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Wygenerowano: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Zakres danych od: ${new Date(logSince).toLocaleString()}`, 14, 35);

    const tableColumn = ["Data i Czas", "ID", "Pracownik", "Status", "Pewność (%)"];
    const tableRows = logs.map(log => {
      let statusText = log.status;
      if (log.status === 'SUCCESS') statusText = 'Prawidłowe';
      if (log.status === 'FACE_MISMATCH') statusText = 'Niezgodna twarz';
      if (log.status === 'NO_FACE') statusText = 'Brak twarzy';
      if (log.status === 'INVALID_QR') statusText = 'Błędny QR';

      return [
        new Date(log.timestamp).toLocaleString(),
        log.employee_id || '-',
        log.full_name || '-',
        statusText,
        log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : '-'
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        font: 'Roboto',
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        font: 'Roboto',
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont('Roboto', 'normal');
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(
            `Strona ${data.pageNumber}`, 
            data.settings.margin.left, 
            pageHeight - 10
        );
      }
    });

    const fileName = `safegate_raport_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fileName);
  };

  const handleGenerateFilteredPDF = async () => {
    setPdfLoading(true);
    try {
        const startIso = new Date(pdfFilters.startDate).toISOString();
        const rawLogs = await api.getLogs(startIso);

        const endTimestamp = new Date(pdfFilters.endDate).getTime();
        const filteredLogs = rawLogs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            if (logTime > endTimestamp) return false;
            if (pdfFilters.userId !== 'all') {
                if (log.employee_id !== Number(pdfFilters.userId)) return false;
            }
            return true;
        });

        if (filteredLogs.length === 0) {
            alert("Brak danych spełniających kryteria.");
            setPdfLoading(false);
            return;
        }

        const doc = new jsPDF('p', 'mm', 'a4');
        
        await applyPolishFont(doc);

        doc.setFontSize(18);
        doc.setFont('Roboto', 'bold');
        doc.text('Raport logowań użytkowników', 14, 22);
        
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Wygenerowano: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Zakres: ${new Date(pdfFilters.startDate).toLocaleString()} - ${new Date(pdfFilters.endDate).toLocaleString()}`, 14, 35);
        
        if (pdfFilters.userId !== 'all') {
            const userName = users.find(u => u.id === Number(pdfFilters.userId))?.full_name || 'Nieznany';
            doc.text(`Użytkownik: ${userName}`, 14, 40);
        } else {
            doc.text(`Użytkownik: Wszyscy`, 14, 40);
        }

        const tableColumn = ["Data i Czas", "ID", "Pracownik", "Status", "Pewność (%)"];
        const tableRows = filteredLogs.map(log => {
            let statusText = log.status;
            if (log.status === 'SUCCESS') statusText = 'Prawidłowe';
            if (log.status === 'FACE_MISMATCH') statusText = 'Niezgodna twarz';
            if (log.status === 'NO_FACE') statusText = 'Brak twarzy';
            if (log.status === 'INVALID_QR') statusText = 'Błędny QR';

            return [
                new Date(log.timestamp).toLocaleString(),
                log.employee_id || '-',
                log.full_name || '-',
                statusText,
                log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : '-'
            ];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            theme: 'grid',
            styles: { 
                fontSize: 8, 
                cellPadding: 3,
                font: 'Roboto' 
            },
            headStyles: { 
                fillColor: [41, 128, 185], 
                textColor: 255, 
                font: 'Roboto',
                fontStyle: 'bold'
            },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            didDrawPage: (data) => {
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.setFont('Roboto', 'normal');
                const pageHeight = doc.internal.pageSize.getHeight();
                doc.text(`Strona ${data.pageNumber}`, data.settings.margin.left, pageHeight - 10);
            }
        });

        const fileName = `raport_${pdfFilters.userId === 'all' ? 'wszyscy' : 'user'}_${new Date().toISOString().slice(0,10)}.pdf`;
        doc.save(fileName);
        setIsPdfModalOpen(false);

    } catch (error) {
        console.error("PDF Error", error);
        alert("Błąd podczas generowania raportu.");
    } finally {
        setPdfLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96 space-y-4">
          <h1 className="text-2xl font-bold text-center">Admin Login</h1>
          <input className="w-full border p-2 rounded" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input className="w-full border p-2 rounded" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Log In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
            <ShieldAlert className="text-blue-600"/>
            <h1 className="text-xl font-bold text-gray-800">SafeGate Admin</h1>
        </div>
        <div className="flex gap-6">
          <button onClick={() => setActiveTab('LOGS')} className={`flex items-center gap-2 ${activeTab === 'LOGS' ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>
            <FileText size={18} /> Raport Wejść
          </button>
          <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-2 ${activeTab === 'USERS' ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>
            <Users size={18} /> Baza Pracowników
          </button>
        </div>
        <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded flex items-center gap-2">
          <LogOut size={18}/> Wyloguj
        </button>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 overflow-y-auto">
        {/* --- LOGS TAB --- */}
        {activeTab === 'LOGS' && (
          <div className="bg-white rounded shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Dziennik Zdarzeń</h2>
              <div className="flex gap-4 items-end">
                <div>
                    <label className="text-xs text-gray-500 block">Pokaż od</label>
                    <input type="datetime-local" className="border p-2 rounded text-sm" value={logSince} onChange={e => setLogSince(e.target.value)} />
                </div>
                <button onClick={fetchData} className="bg-gray-100 p-2 rounded hover:bg-gray-200" title="Odśwież">
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
                
                <button 
                    onClick={() => setIsPdfModalOpen(true)} 
                    className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex items-center gap-2 ml-2 shadow-sm transition-all"
                    title="Generuj Raport PDF"
                >
                    <FileText size={20} />
                    <span className="text-sm font-semibold">PDF</span>
                </button>

                <div className="border-l pl-4 ml-2">
                    <label className="text-xs text-red-500 block">Usuń starsze niż</label>
                    <div className="flex gap-2">
                        <input type="datetime-local" className="border p-2 rounded text-sm" value={pruneDate} onChange={e => setPruneDate(e.target.value)} />
                        <button onClick={handlePruneLogs} className="bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200">Usuń</button>
                    </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 uppercase text-gray-600">
                  <tr>
                    <th className="p-3">Data i Godzina</th>
                    <th className="p-3">Pracownik</th>
                    <th className="p-3">Status / Powód</th>
                    <th className="p-3">Pewność</th>
                    <th className="p-3 text-center">Dowód</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-gray-600">
                          {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium">
                          {log.status === 'INVALID_QR' ? (
                              <span className="text-red-500 font-mono text-xs" title="Błędny kod QR">
                                BŁĄD: {log.qr_content || 'Brak danych'}
                              </span>
                          ) : (
                              log.full_name || `ID: ${log.employee_id}` || '-'
                          )}
                      </td>
                      <td className="p-3">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="p-3 text-gray-700">
                          {log.confidence ? (log.confidence * 100).toFixed(1) + '%' : '-'}
                      </td>
                      <td className="p-3 text-center">
                        {log.captured_image ? (
                            <button 
                                onClick={() => setViewImage(log.captured_image || null)}
                                className="text-blue-500 hover:bg-blue-50 p-2 rounded transition"
                                title="Zobacz zdjęcie"
                            >
                                <ImageIcon size={20} />
                            </button>
                        ) : (
                            <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Brak logów.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === 'USERS' && (
          <div className="bg-white rounded shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Baza Pracowników</h2>
              <button onClick={() => setIsAddUserOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
                <Plus size={18} /> Dodaj Pracownika
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 uppercase text-gray-600">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Imię i Nazwisko</th>
                    <th className="p-3">Zdjęcie</th>
                    <th className="p-3">Token QR</th>
                    <th className="p-3">Ważny do</th>
                    <th className="p-3 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-500">{user.id}</td>
                      <td className="p-3 font-medium text-gray-900">{user.full_name}</td>
                      <td className="p-3">
                        {user.reference_photo_base64 ? (
                          <img src={user.reference_photo_base64} alt="Ref" className="w-10 h-10 object-cover rounded-full border" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500">Brak</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-gray-500">{user.qr_token}</td>
                      <td className="p-3">{new Date(user.qr_valid_until).toLocaleDateString()}</td>
                      <td className="p-3 flex justify-end gap-2">
                        <button onClick={() => setSelectedQrUser(user)} className="text-purple-600 hover:bg-purple-50 p-2 rounded" title="Kod QR">
                            <QrCode size={18} />
                        </button>
                        {/* Zaktualizowany handler do otwierania modala */}
                        <button 
                            onClick={() => openRegenerateModal(user)} 
                            className="text-indigo-600 hover:bg-indigo-50 p-2 rounded" 
                            title="Wygeneruj nowy kod QR (unieważnij stary)"
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button onClick={() => handleShowHistory(user)} className="text-blue-500 hover:bg-blue-50 p-2 rounded" title="Historia">
                            <History size={18} />
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:bg-red-50 p-2 rounded" title="Usuń">
                            <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* --- REGENERATE QR CONFIRMATION MODAL --- */}
      {regenerateTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] animate-in fade-in duration-200 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md transform scale-100 transition-all">
                <div className="flex items-start gap-4 mb-4">
                    <div className="bg-amber-100 p-2 rounded-full flex-shrink-0">
                        <AlertTriangle className="text-amber-600" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Regeneracja Tokena QR</h3>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                            Czy na pewno chcesz wygenerować nowy kod QR dla użytkownika <span className="font-semibold text-gray-800">{regenerateTarget.full_name}</span>?
                        </p>
                        <div className="mt-3 bg-red-50 border border-red-100 p-3 rounded text-xs text-red-700 font-medium">
                            <span className="block font-bold mb-1">Uwaga:</span>
                            Obecny kod QR zostanie natychmiast unieważniony. Wszystkie wydrukowane kopie starego kodu przestaną działać.
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                    <button 
                        onClick={() => setRegenerateTarget(null)} 
                        className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 font-medium transition text-sm disabled:opacity-50"
                        disabled={isRegenerating}
                    >
                        Anuluj
                    </button>
                    <button 
                        onClick={confirmRegeneration} 
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium shadow-sm transition text-sm flex items-center gap-2 disabled:bg-indigo-400"
                        disabled={isRegenerating}
                    >
                        {isRegenerating ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" /> Generowanie...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={16} /> Generuj nowy kod
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- Image Preview Modal --- */}
      {viewImage && (
        <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-200" 
            onClick={() => setViewImage(null)}
        >
            <div className="relative max-w-4xl max-h-[90vh] p-2" onClick={e => e.stopPropagation()}>
                <img 
                    src={viewImage} 
                    alt="Evidence" 
                    className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl border border-gray-700"
                />
                <button 
                    onClick={() => setViewImage(null)}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
                >
                    <X size={32} />
                </button>
            </div>
        </div>
      )}

      {/* --- PDF Filter Modal --- */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-96">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <FileText className="text-blue-600" /> Generuj Raport PDF
                    </h3>
                    <button onClick={() => setIsPdfModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pracownik</label>
                        <select 
                            className="w-full border p-2 rounded"
                            value={pdfFilters.userId}
                            onChange={(e) => setPdfFilters({...pdfFilters, userId: e.target.value})}
                        >
                            <option value="all">Wszyscy użytkownicy</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name} (ID: {u.id})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data od</label>
                        <input 
                            type="datetime-local" 
                            className="w-full border p-2 rounded"
                            value={pdfFilters.startDate}
                            onChange={(e) => setPdfFilters({...pdfFilters, startDate: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data do</label>
                        <input 
                            type="datetime-local" 
                            className="w-full border p-2 rounded"
                            value={pdfFilters.endDate}
                            onChange={(e) => setPdfFilters({...pdfFilters, endDate: e.target.value})}
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={() => setIsPdfModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                        Anuluj
                    </button>
                    <button 
                        onClick={handleGenerateFilteredPDF} 
                        disabled={pdfLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:bg-blue-300"
                    >
                        {pdfLoading ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
                        Generuj
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- QR Code Modal --- */}
      {selectedQrUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-sm flex flex-col items-center relative">
            <button onClick={() => setSelectedQrUser(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-2">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold mb-2 text-gray-800">Kod QR</h3>
            <p className="text-sm text-gray-500 mb-6">{selectedQrUser.full_name}</p>
            <div className="p-4 bg-white border-2 border-gray-100 rounded-xl shadow-inner mb-6">
               <QRCodeCanvas id="qr-code-modal" value={selectedQrUser.qr_token || ""} size={256} level={"H"} includeMargin={true} />
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={downloadQRFromModal} disabled={!selectedQrUser.qr_token} className={`flex-1 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition ${!selectedQrUser.qr_token ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                <Download size={18} /> Pobierz
              </button>
              <button onClick={() => setSelectedQrUser(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition">Zamknij</button>
            </div>
          </div>
        </div>
      )}

      {/* --- User History Modal --- */}
      {selectedHistoryUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-4 shrink-0">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <History size={24} className="text-blue-600" />
                        Historia pracownika
                    </h3>
                    <button onClick={() => setSelectedHistoryUser(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <div className="mb-4 shrink-0">
                    <p className="text-lg font-medium">{selectedHistoryUser.full_name}</p>
                    <p className="text-xs text-gray-400 font-mono">ID: {selectedHistoryUser.id}</p>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 border rounded bg-gray-50">
                    {historyLoading ? (
                        <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                            <RefreshCw className="animate-spin" /> Ładowanie...
                        </div>
                    ) : historyLogs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Brak wpisów.</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 uppercase text-gray-600 sticky top-0 shadow-sm">
                                <tr>
                                    <th className="p-3">Data i Czas</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Pewność</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {historyLogs.map((log) => (
                                    <tr key={log.log_id} className="hover:bg-gray-50">
                                        <td className="p-3 font-mono text-gray-600">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-3">
                                            {getStatusBadge(log.status)}
                                        </td>
                                        <td className="p-3 text-gray-700">
                                            {log.confidence ? (log.confidence * 100).toFixed(1) + '%' : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                
                <div className="mt-4 pt-4 border-t flex justify-end shrink-0">
                    <button onClick={() => setSelectedHistoryUser(null)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition">Zamknij</button>
                </div>
            </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-96 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Dodaj Pracownika</h3>
                <label className="block text-sm mb-1">Imię i Nazwisko</label>
                <input className="w-full border p-2 mb-3 rounded" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
                <label className="block text-sm mb-1">Ważny do</label>
                <input type="datetime-local" className="w-full border p-2 mb-3 rounded" value={newUser.qr_valid_until} onChange={e => setNewUser({...newUser, qr_valid_until: e.target.value})} />
                <label className="block text-sm mb-1">Zdjęcie referencyjne</label>
                <div className="mb-4">
                  {!newUser.reference_photo_base64 ? (
                    <label className="w-full border-2 border-dashed border-gray-300 rounded p-4 flex flex-col items-center cursor-pointer hover:bg-gray-50 transition-colors">
                      <Upload className="text-gray-400 mb-1" size={24} />
                      <span className="text-xs text-gray-500">Kliknij, aby wgrać zdjęcie</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  ) : (
                    <div className="relative">
                      <img src={newUser.reference_photo_base64} alt="Preview" className="w-full h-40 object-cover rounded border" />
                      <button onClick={handleRemovePhoto} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsAddUserOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Anuluj</button>
                    <button onClick={handleAddUser} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Zapisz</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;