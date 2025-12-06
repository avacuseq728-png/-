import React, { useState, useEffect } from 'react';
import { User, Role } from './types';
import { StorageService } from './services/storageService';
import DoctorEntry from './components/DoctorEntry';
import AdminDashboard from './components/AdminDashboard';
import { LogIn, LogOut, Activity, Lock, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [usernameInput, setUsernameInput] = useState('');

  useEffect(() => {
    const currentUser = StorageService.getCurrentUser();
    if (currentUser) setUser(currentUser);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const loggedInUser = StorageService.login(usernameInput);
    if (loggedInUser) {
      setUser(loggedInUser);
      setUsernameInput('');
    } else {
      alert('用户不存在。请尝试 "dr_wang" 或 "admin_li"');
    }
  };

  const handleLogout = () => {
    StorageService.logout();
    setUser(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700 p-4">
        <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-md w-full border border-white/20 animate-fade-in-up">
          <div className="text-center mb-8">
             <div className="bg-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform rotate-3 hover:rotate-0 transition-all duration-300">
                <Activity className="w-10 h-10 text-white" />
             </div>
             <h1 className="text-3xl font-bold text-gray-900 tracking-tight">DRG 智能卫士</h1>
             <p className="text-gray-500 mt-2 text-sm">基层诊疗数据合规校验系统 v1.0</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">系统账号</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full pl-4 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition bg-gray-50 focus:bg-white"
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition flex items-center justify-center shadow-lg hover:shadow-xl transform active:scale-95 duration-200">
              <LogIn className="w-5 h-5 mr-2" /> 安全登录
            </button>
          </form>

          <div className="mt-8 text-xs text-center border-t border-gray-100 pt-6">
            <p className="text-gray-400 mb-2">仅供演示使用 · 点击下方账号快速填入</p>
            <div className="flex justify-center space-x-4">
              <button onClick={() => setUsernameInput('dr_wang')} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition">医生: dr_wang</button>
              <button onClick={() => setUsernameInput('admin_li')} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition">管理员: admin_li</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-blue-600 p-1.5 rounded-lg mr-3">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block tracking-tight">DRG 智能卫士</span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">{user.username}</p>
                <div className="flex items-center justify-end text-xs text-gray-500 mt-0.5">
                  <ShieldCheck className="w-3 h-3 mr-1 text-green-500"/>
                  <span className="capitalize">{user.role === 'DOCTOR' ? '执业医师' : '系统管理员'} | {user.clinicName}</span>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
              <button 
                onClick={handleLogout}
                className="flex items-center text-gray-500 hover:text-red-600 transition text-sm font-medium"
                title="退出登录"
              >
                <LogOut className="w-5 h-5 sm:mr-1" />
                <span className="hidden sm:inline">退出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.role === Role.ADMIN ? (
          <AdminDashboard />
        ) : (
          <DoctorEntry user={user} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400">
           <span>&copy; 2024 DRG 智能校验系统 (演示版)</span>
           <span className="flex items-center mt-2 sm:mt-0"><Lock className="w-3 h-3 mr-1"/> 医保级数据加密传输协议已启用</span>
        </div>
      </footer>
    </div>
  );
};

export default App;