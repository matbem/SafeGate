// frontend/src/Pages/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Employee, AccessLog } from '../types';
import { LogOut, Users, FileText, Trash2, Plus, RefreshCw, History, ShieldAlert, Upload, X } from 'lucide-react';

const AdminPage: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState<'LOGS' | 'USERS'>('LOGS');

  // Data State
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [users, setUsers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters / Inputs
  // Używamy toISOString().slice(0, 16) aby uzyskać format YYYY-MM-DDThh:mm wymagany przez input
  const [logSince, setLogSince] = useState(new Date(Date.now() - 86400000).toISOString().slice(0, 16));
  const [pruneDate, setPruneDate] = useState('');

  // New User Form State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const [newUser, setNewUser] = useState<{ full_name: string; qr_valid_until: string; reference_photo_base64?: string }>({
    full_name: '',
    // Domyślnie +1 rok
    qr_valid_until: new Date(Date.now() + 31536000000).toISOString().slice(0, 16),
    reference_photo_base64: ''
  });

  // Init
  useEffect(() => {
    if (token) fetchData();
  }, [token, activeTab]);

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
        // Konwersja na pełne ISO dla backendu
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

  // --- Handlers ---

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

  const handleRemovePhoto = () => {
    setNewUser(prev => ({ ...prev, reference_photo_base64: '' }));
  };

  const handleAddUser = async () => {
    try {
      // Przygotowanie payloadu: data musi być pełnym ISO stringiem
      const payload = {
        full_name: newUser.full_name,
        qr_valid_until: new Date(newUser.qr_valid_until).toISOString(),
        // Wyślij pole tylko jeśli zawiera dane, w przeciwnym razie undefined
        reference_photo_base64: newUser.reference_photo_base64 || undefined
      };

      await api.addUsers([payload]);

      setIsAddUserOpen(false);
      fetchData();

      // Reset formularza
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

  const handleShowHistory = async (employeeId: number) => {
    try {
        const history = await api.getEmployeeHistory(employeeId);
        alert(`Last 10 entries for ID ${employeeId}:\n` + history.map(h => `${h.timestamp}: ${h.status}`).join('\n'));
    } catch (error) {
        alert('Could not fetch history');
    }
  };

  // --- Login View ---
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

  // --- Main View ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
            <ShieldAlert className="text-blue-600"/>
            <h1 className="text-xl font-bold text-gray-800">SafeGate Admin</h1>
        </div>
        <div className="flex gap-6">
          <button onClick={() => setActiveTab('LOGS')} className={`flex items-center gap-2 ${activeTab === 'LOGS' ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>
            <FileText size={18} /> Logs
          </button>
          <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-2 ${activeTab === 'USERS' ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>
            <Users size={18} /> Employees
          </button>
        </div>
        <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded flex items-center gap-2">
          <LogOut size={18}/> Logout
        </button>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">

        {/* --- LOGS TAB --- */}
        {activeTab === 'LOGS' && (
          <div className="bg-white rounded shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Access Logs</h2>
              <div className="flex gap-4 items-end">
                <div>
                    <label className="text-xs text-gray-500 block">Show logs since</label>
                    <input type="datetime-local" className="border p-2 rounded text-sm" value={logSince} onChange={e => setLogSince(e.target.value)} />
                </div>
                <button onClick={fetchData} className="bg-gray-100 p-2 rounded hover:bg-gray-200">
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
                <div className="border-l pl-4 ml-2">
                    <label className="text-xs text-red-500 block">Prune older than</label>
                    <div className="flex gap-2">
                        <input type="datetime-local" className="border p-2 rounded text-sm" value={pruneDate} onChange={e => setPruneDate(e.target.value)} />
                        <button onClick={handlePruneLogs} className="bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200">Prune</button>
                    </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 uppercase text-gray-600">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Confidence</th>
                    <th className="p-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-gray-50">
                      <td className="p-3">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-3 font-medium">{log.full_name || `ID: ${log.employee_id}` || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3">{log.confidence ? (log.confidence * 100).toFixed(1) + '%' : '-'}</td>
                      <td className="p-3 text-gray-500">{log.device_ip}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">No logs found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === 'USERS' && (
          <div className="bg-white rounded shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Employee Management</h2>
              <button onClick={() => setIsAddUserOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
                <Plus size={18} /> Add Employee
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 uppercase text-gray-600">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Photo</th>
                    <th className="p-3">QR Token</th>
                    <th className="p-3">Valid Until</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-500">{user.id}</td>
                      <td className="p-3 font-medium text-gray-900">{user.full_name}</td>
                      <td className="p-3">
                        {user.reference_photo_base64 ? (
                          <img
                            src={user.reference_photo_base64}
                            alt="Ref"
                            className="w-10 h-10 object-cover rounded-full border"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500">No Img</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-gray-500">{user.qr_token}</td>
                      <td className="p-3">{new Date(user.qr_valid_until).toLocaleDateString()}</td>
                      <td className="p-3 flex justify-end gap-2">
                        <button onClick={() => handleShowHistory(user.id)} className="text-blue-500 hover:bg-blue-50 p-2 rounded" title="View History">
                            <History size={18} />
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:bg-red-50 p-2 rounded" title="Delete">
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

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-96 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Add New Employee</h3>

                <label className="block text-sm mb-1">Full Name</label>
                <input
                    className="w-full border p-2 mb-3 rounded"
                    value={newUser.full_name}
                    onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                />

                <label className="block text-sm mb-1">Valid Until</label>
                <input
                    type="datetime-local"
                    className="w-full border p-2 mb-3 rounded"
                    value={newUser.qr_valid_until}
                    onChange={e => setNewUser({...newUser, qr_valid_until: e.target.value})}
                />

                <label className="block text-sm mb-1">Reference Photo</label>
                <div className="mb-4">
                  {!newUser.reference_photo_base64 ? (
                    <label className="w-full border-2 border-dashed border-gray-300 rounded p-4 flex flex-col items-center cursor-pointer hover:bg-gray-50 transition-colors">
                      <Upload className="text-gray-400 mb-1" size={24} />
                      <span className="text-xs text-gray-500">Click to upload photo</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  ) : (
                    <div className="relative">
                      <img
                        src={newUser.reference_photo_base64}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded border"
                      />
                      <button
                        onClick={handleRemovePhoto}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsAddUserOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button onClick={handleAddUser} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;