import React, { useState, useEffect } from 'react';
import { DrgRule, PatientRecord, MetricRule, User, Role } from '../types';
import { StorageService } from '../services/storageService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { Download, ShieldCheck, ShieldAlert, FileText, Settings, Plus, Save, X, Activity, Trash2, Users, UserPlus, FileBarChart, Zap, Eye } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'reports' | 'history' | 'rules' | 'users'>('stats');
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [rules, setRules] = useState<DrgRule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Modal State for Viewing Details
  const [viewingRecord, setViewingRecord] = useState<PatientRecord | null>(null);
  
  // Clear Data Confirmation State
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Rule Editing State
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState<number>(0);

  // Add New Rule State
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRule, setNewRule] = useState<Partial<DrgRule>>({
    diseaseName: '',
    drgCode: '',
    maxCost: 0,
    requiredMetrics: [],
    isActive: true
  });

  // Add User State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', clinicName: '' });

  useEffect(() => {
    setRecords(StorageService.getRecords());
    setRules(StorageService.getRules());
    setUsers(StorageService.getUsers());
  }, [activeTab]); // Refresh when tab changes

  // Stats Logic
  const totalRecords = records.length;
  const compliantRecords = records.filter(r => r.status === 'COMPLIANT').length;
  const complianceRate = totalRecords ? Math.round((compliantRecords / totalRecords) * 100) : 100;

  // Chart Data
  const recordsByDoctor = records.reduce((acc, curr) => {
    acc[curr.doctorName] = (acc[curr.doctorName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const barChartData = Object.keys(recordsByDoctor).map(name => ({
    name,
    submissions: recordsByDoctor[name]
  }));

  const pieData = [
    { name: '合规', value: compliantRecords },
    { name: '违规', value: totalRecords - compliantRecords }
  ];
  const COLORS = ['#10B981', '#EF4444'];

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(records.map(r => ({
      ...r,
      metrics: JSON.stringify(r.metrics),
      validationMessages: r.validationMessages.join('; '),
      fullPatientInfo: `${r.patientName} (${r.gender}/${r.age}岁/${r.ethnicity || '未填'}) - ${r.contactNumber}`,
      medicalHistory: `过敏: ${r.allergyHistory || '无'} | 既往: ${r.pastMedicalHistory || '无'}`
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DRG_Audit_Log");
    XLSX.writeFile(wb, "DRG_Audit_Data.xlsx");
  };

  // --- Mock Data Generation ---
  const handleGenerateMockData = () => {
     // Check for doctors first
     const doctors = users.filter(u => u.role === Role.DOCTOR);
     if (doctors.length === 0) {
         alert("系统检测到当前没有‘医生’角色的账号。\n\n请先切换到【人员管理】标签页，添加至少一名医生账号，然后再生成演示数据。");
         return;
     }

     try {
       const mockRecords: PatientRecord[] = [];
       const now = new Date();
       
       const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
       const randomFloat = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
       const ethnicities = ['汉族', '汉族', '汉族', '回族', '壮族', '满族'];
       const allergyOpts = ['无', '无', '无', '青霉素过敏', '磺胺类过敏', '芒果过敏'];
       const historyOpts = ['无', '无', '无', '高血压史5年', '阑尾炎术后', '糖尿病史2年'];

       for (let i = 0; i < 20; i++) {
           const rule = rules[randomInt(0, rules.length - 1)];
           const doctor = doctors[randomInt(0, doctors.length - 1)];
           const isCompliant = Math.random() > 0.2; // 80% compliant

           // Generate Metrics
           const metrics: Record<string, number> = {};
           rule.requiredMetrics.forEach(m => {
               // If compliant, generate within range. If not, small chance to be out.
               if (isCompliant || Math.random() > 0.5) {
                   metrics[m.key] = randomFloat(m.min, m.max);
               } else {
                   // Generate outlier
                   metrics[m.key] = Math.random() > 0.5 ? randomFloat(m.max + 1, m.max + 10) : randomFloat(m.min - 5, m.min - 0.1);
               }
           });

           const maxCost = rule.maxCost;
           const totalCost = isCompliant 
              ? randomFloat(maxCost * 0.5, maxCost) 
              : Math.random() > 0.5 ? randomFloat(maxCost + 10, maxCost + 100) : randomFloat(maxCost * 0.5, maxCost);

           const status = (totalCost <= maxCost) ? 'COMPLIANT' : 'FLAGGED';

           const date = new Date(now);
           date.setDate(date.getDate() - randomInt(0, 30));

           mockRecords.push({
               id: crypto.randomUUID(),
               recordDate: date.toISOString(),
               doctorName: doctor.username,
               clinicName: doctor.clinicName,
               patientName: `演示患者${randomInt(100, 999)}`,
               patientId: `ID${randomInt(100000, 999999)}`,
               age: randomInt(20, 80),
               gender: Math.random() > 0.5 ? '男' : '女',
               ethnicity: ethnicities[randomInt(0, ethnicities.length - 1)],
               contactNumber: `13${randomInt(0, 9)}${randomInt(10000000, 99999999)}`,
               allergyHistory: allergyOpts[randomInt(0, allergyOpts.length - 1)],
               pastMedicalHistory: historyOpts[randomInt(0, historyOpts.length - 1)],
               diseaseId: rule.id,
               diseaseName: rule.diseaseName,
               metrics: metrics,
               totalCost: totalCost,
               status: status,
               validationMessages: status === 'FLAGGED' ? ['模拟的费用超标记录'] : []
           });
       }

       // Overwrite existing data
       const finalRecords = mockRecords;
       StorageService.saveRecords(finalRecords);
       setRecords(finalRecords);
       alert(`成功重置并生成 20 条随机演示数据！`);
     } catch (e: any) {
       console.error(e);
       alert("生成数据失败: " + e.message);
     }
  };

  const executeClearData = () => {
    try {
      const emptyRecords: PatientRecord[] = [];
      StorageService.saveRecords(emptyRecords);
      setRecords(emptyRecords);
      setShowClearConfirm(false);
    } catch (e) {
      console.error(e);
      alert("清空失败，请刷新页面重试");
    }
  };

  // --- Report Aggregation Logic ---
  const getClinicStats = () => {
    const stats: Record<string, { count: number; totalCost: number; doctors: Set<string> }> = {};
    
    records.forEach(r => {
      if (!stats[r.clinicName]) {
        stats[r.clinicName] = { count: 0, totalCost: 0, doctors: new Set() };
      }
      stats[r.clinicName].count += 1;
      stats[r.clinicName].totalCost += r.totalCost;
      stats[r.clinicName].doctors.add(r.doctorName);
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      count: data.count,
      totalCost: data.totalCost,
      avgCost: data.count ? data.totalCost / data.count : 0,
      doctorCount: data.doctors.size
    }));
  };

  const getDoctorStats = () => {
    const stats: Record<string, { count: number; totalCost: number; clinic: string }> = {};
    
    records.forEach(r => {
      if (!stats[r.doctorName]) {
        stats[r.doctorName] = { count: 0, totalCost: 0, clinic: r.clinicName };
      }
      stats[r.doctorName].count += 1;
      stats[r.doctorName].totalCost += r.totalCost;
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      clinic: data.clinic,
      count: data.count,
      totalCost: data.totalCost,
      avgCost: data.count ? data.totalCost / data.count : 0
    }));
  };

  // --- Edit Existing Rule Logic ---
  const startEditRule = (rule: DrgRule) => {
    setEditingRuleId(rule.id);
    setEditCost(rule.maxCost);
  };

  const cancelEdit = () => {
    setEditingRuleId(null);
  };

  const saveRule = () => {
    if (!editingRuleId) return;
    const updatedRules = rules.map(r => {
        if (r.id === editingRuleId) {
            return { ...r, maxCost: editCost };
        }
        return r;
    });
    setRules(updatedRules);
    StorageService.saveRules(updatedRules);
    setEditingRuleId(null);
    alert("规则已更新！新的费用上限将立即生效。");
  };

  // --- Add New Rule Logic ---
  const handleAddMetric = () => {
    setNewRule(prev => ({
      ...prev,
      requiredMetrics: [
        ...(prev.requiredMetrics || []),
        { key: `m_${crypto.randomUUID().slice(0, 8)}`, label: '', unit: '', min: 0, max: 0 }
      ]
    }));
  };

  const handleMetricChange = (index: number, field: keyof MetricRule, value: string | number) => {
    const updatedMetrics = [...(newRule.requiredMetrics || [])];
    updatedMetrics[index] = { ...updatedMetrics[index], [field]: value };
    setNewRule(prev => ({ ...prev, requiredMetrics: updatedMetrics }));
  };

  const handleRemoveMetric = (index: number) => {
    const updatedMetrics = [...(newRule.requiredMetrics || [])];
    updatedMetrics.splice(index, 1);
    setNewRule(prev => ({ ...prev, requiredMetrics: updatedMetrics }));
  };

  const handleSaveNewRule = () => {
    if (!newRule.diseaseName || !newRule.drgCode || !newRule.maxCost) {
        alert("请填写完整的疾病名称、DRG编码和费用上限");
        return;
    }

    if (!newRule.requiredMetrics || newRule.requiredMetrics.length === 0) {
        alert("请至少添加一项必填检测指标");
        return;
    }

    // Validate metric ranges
    for (const metric of newRule.requiredMetrics) {
      if (!metric.label || !metric.unit) {
          alert("请完善所有检测指标的名称和单位");
          return;
      }
      
      const min = Number(metric.min);
      const max = Number(metric.max);

      if (min > max) {
        alert(`指标【${metric.label}】配置错误：最小值 (${min}) 不能大于最大值 (${max})，请修正。`);
        return;
      }
    }
    
    // Construct valid DrgRule
    const ruleToAdd: DrgRule = {
        id: crypto.randomUUID(),
        diseaseName: newRule.diseaseName!,
        drgCode: newRule.drgCode!,
        maxCost: Number(newRule.maxCost),
        requiredMetrics: newRule.requiredMetrics.map(m => ({
            ...m,
            min: Number(m.min),
            max: Number(m.max)
        })),
        isActive: true
    };

    const updatedRules = [...rules, ruleToAdd];
    setRules(updatedRules);
    StorageService.saveRules(updatedRules);
    
    // Reset
    setIsAddingRule(false);
    setNewRule({
        diseaseName: '',
        drgCode: '',
        maxCost: 0,
        requiredMetrics: [],
        isActive: true
    });
    alert("新规则添加成功！");
  };

  // --- Add User Logic ---
  const handleAddUser = () => {
    if (!newUser.username || !newUser.clinicName) {
      alert("请填写用户名和诊所名称");
      return;
    }
    
    try {
      const userToAdd: User = {
        id: crypto.randomUUID(),
        username: newUser.username,
        role: Role.DOCTOR,
        clinicName: newUser.clinicName
      };
      
      StorageService.addUser(userToAdd);
      setUsers(StorageService.getUsers());
      setNewUser({ username: '', clinicName: '' });
      setIsAddingUser(false);
      alert("医生账号添加成功！他们现在可以使用该用户名登录系统。");
    } catch (e: any) {
      alert(e.message || "添加用户失败");
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 sm:space-x-4 border-b border-gray-200 pb-2 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('stats')} 
          className={`flex items-center px-4 py-3 font-medium transition-colors rounded-t-lg ${activeTab === 'stats' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <ShieldCheck className="w-4 h-4 mr-2" /> 概览与统计
        </button>
        <button 
          onClick={() => setActiveTab('reports')} 
          className={`flex items-center px-4 py-3 font-medium transition-colors rounded-t-lg ${activeTab === 'reports' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <FileBarChart className="w-4 h-4 mr-2" /> 统计报表
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={`flex items-center px-4 py-3 font-medium transition-colors rounded-t-lg ${activeTab === 'history' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <FileText className="w-4 h-4 mr-2" /> 审计日志
        </button>
        <button 
          onClick={() => setActiveTab('rules')} 
          className={`flex items-center px-4 py-3 font-medium transition-colors rounded-t-lg ${activeTab === 'rules' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Settings className="w-4 h-4 mr-2" /> 规则引擎
        </button>
        <button 
          onClick={() => setActiveTab('users')} 
          className={`flex items-center px-4 py-3 font-medium transition-colors rounded-t-lg ${activeTab === 'users' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Users className="w-4 h-4 mr-2" /> 人员管理
        </button>
      </div>

      {/* 1. STATS VIEW */}
      {activeTab === 'stats' && (
        <div className="animate-fade-in space-y-6">
          
          {/* Mock Data Banner */}
           <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between shadow-sm">
              <div className="mb-4 md:mb-0">
                 <h3 className="text-lg font-bold text-indigo-900 flex items-center">
                   <Zap className="w-5 h-5 mr-2 text-indigo-600" fill="currentColor"/>
                   DRG 智能校验系统演示环境
                 </h3>
                 <p className="text-indigo-700 text-sm mt-1">
                   {records.length === 0 
                      ? "当前系统暂无数据。点击右侧按钮生成随机演示数据，快速体验报表统计与审计功能。" 
                      : `系统已有 ${records.length} 条记录。您可以使用右侧按钮重新生成或清空数据。`
                   }
                 </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {records.length > 0 && (
                  !showClearConfirm ? (
                    <button 
                      onClick={() => setShowClearConfirm(true)}
                      className="bg-white text-red-600 border border-red-200 px-5 py-2.5 rounded-lg font-bold hover:bg-red-50 transition shadow-sm hover:shadow-md flex items-center justify-center whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      清空数据
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-1.5 rounded-lg animate-fade-in">
                        <span className="text-xs font-bold text-red-700 ml-1">确认删除?</span>
                        <button 
                          onClick={executeClearData}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-bold hover:bg-red-700 shadow-sm"
                        >
                          是
                        </button>
                        <button 
                          onClick={() => setShowClearConfirm(false)}
                          className="bg-white text-gray-600 border border-gray-300 px-3 py-1.5 rounded-md text-sm font-bold hover:bg-gray-50 shadow-sm"
                        >
                          否
                        </button>
                    </div>
                  )
                )}
                <button 
                  onClick={handleGenerateMockData}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center whitespace-nowrap"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  生成随机演示数据
                </button>
              </div>
           </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <h3 className="text-gray-500 text-xs uppercase font-bold tracking-wider relative z-10">总提交量</h3>
              <p className="text-4xl font-bold text-gray-800 mt-2 relative z-10">{totalRecords}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
               <div className="absolute right-0 top-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <h3 className="text-gray-500 text-xs uppercase font-bold tracking-wider relative z-10">合规率</h3>
              <div className="flex items-center mt-2 relative z-10">
                <p className={`text-4xl font-bold ${complianceRate > 90 ? 'text-green-500' : 'text-yellow-500'}`}>{complianceRate}%</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
               <div className="absolute right-0 top-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <h3 className="text-gray-500 text-xs uppercase font-bold tracking-wider relative z-10">执业医师</h3>
              <p className="text-4xl font-bold text-purple-500 mt-2 relative z-10">{users.filter(u => u.role === Role.DOCTOR).length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
              <h3 className="text-gray-700 font-bold mb-4 flex items-center"><Activity className="w-4 h-4 mr-2 text-blue-500"/> 医生提交量排名</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                  <Bar dataKey="submissions" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
              <h3 className="text-gray-700 font-bold mb-4 flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-green-500"/> 合规分布</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={80} 
                    fill="#8884d8" 
                    paddingAngle={5} 
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 2. REPORTS VIEW */}
      {activeTab === 'reports' && (
        <div className="animate-fade-in space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Clinic Stats Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800 flex items-center">
                   <Activity className="w-4 h-4 mr-2 text-blue-600"/> 各诊所绩效报表
                 </h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="min-w-full text-sm text-left">
                   <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
                     <tr>
                       <th className="px-4 py-3">诊所名称</th>
                       <th className="px-4 py-3">医生人数</th>
                       <th className="px-4 py-3 text-right">提交量</th>
                       <th className="px-4 py-3 text-right">均次费用</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-200">
                     {getClinicStats().map(stat => (
                       <tr key={stat.name} className="hover:bg-gray-50">
                         <td className="px-4 py-3 font-medium text-gray-800">{stat.name}</td>
                         <td className="px-4 py-3">{stat.doctorCount}</td>
                         <td className="px-4 py-3 text-right font-bold">{stat.count}</td>
                         <td className="px-4 py-3 text-right font-mono">¥{stat.avgCost.toFixed(2)}</td>
                       </tr>
                     ))}
                     {getClinicStats().length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">暂无数据</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>

            {/* Doctor Stats Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800 flex items-center">
                   <Users className="w-4 h-4 mr-2 text-purple-600"/> 医生合规统计报表
                 </h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="min-w-full text-sm text-left">
                   <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
                     <tr>
                       <th className="px-4 py-3">医生姓名</th>
                       <th className="px-4 py-3">所属诊所</th>
                       <th className="px-4 py-3 text-right">提交量</th>
                       <th className="px-4 py-3 text-center">合规率</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-200">
                     {getDoctorStats().map(stat => (
                       <tr key={stat.name} className="hover:bg-gray-50">
                         <td className="px-4 py-3 font-medium text-gray-800">{stat.name}</td>
                         <td className="px-4 py-3 text-gray-500 text-xs">{stat.clinic}</td>
                         <td className="px-4 py-3 text-right font-bold">{stat.count}</td>
                         <td className="px-4 py-3 text-center">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">100%</span>
                         </td>
                       </tr>
                     ))}
                     {getDoctorStats().length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">暂无数据</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
            
            <div className="lg:col-span-2 text-center pb-4">
                 <button onClick={handleExport} className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-xl shadow hover:bg-blue-700 transition">
                    <Download className="w-5 h-5 mr-2" />
                    下载完整运营报表 (Excel)
                 </button>
                 <p className="text-gray-400 text-xs mt-2">包含所有诊所与医生的详细审计明细及预警处理记录</p>
            </div>

          </div>
        </div>
      )}

      {/* 3. HISTORY VIEW */}
      {activeTab === 'history' && (
        <div className="animate-fade-in bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
             <h3 className="font-bold text-gray-700">详细记录</h3>
             <button onClick={handleExport} className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition shadow-sm hover:shadow">
               <Download className="w-4 h-4 mr-2" /> 导出 Excel
             </button>
           </div>
           <div className="overflow-x-auto">
             <table className="min-w-full text-sm text-left">
               <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
                 <tr>
                   <th className="px-6 py-4">日期</th>
                   <th className="px-6 py-4">医生</th>
                   <th className="px-6 py-4">患者</th>
                   <th className="px-6 py-4">疾病</th>
                   <th className="px-6 py-4">费用</th>
                   <th className="px-6 py-4">状态</th>
                   <th className="px-6 py-4 text-center">操作</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-200">
                 {records.map(r => (
                   <tr key={r.id} className="hover:bg-gray-50 transition">
                     <td className="px-6 py-4 whitespace-nowrap text-gray-600">{new Date(r.recordDate).toLocaleDateString()}</td>
                     <td className="px-6 py-4 font-medium text-gray-900">{r.doctorName}</td>
                     <td className="px-6 py-4 text-gray-600">
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{r.patientName}</span>
                            <span className="text-xs text-gray-400">{r.gender || '-'} / {r.age || '-'}岁</span>
                            {r.ethnicity && <span className="text-xs text-gray-400">{r.ethnicity}</span>}
                        </div>
                     </td>
                     <td className="px-6 py-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{r.diseaseName}</span></td>
                     <td className="px-6 py-4 font-mono font-medium">¥{r.totalCost}</td>
                     <td className="px-6 py-4">
                       <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${r.status === 'COMPLIANT' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                         {r.status === 'COMPLIANT' ? '合规' : '违规'}
                       </span>
                     </td>
                     <td className="px-6 py-4 text-center">
                        <button 
                           onClick={() => setViewingRecord(r)}
                           className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded transition"
                           title="查看详情"
                        >
                           <Eye className="w-5 h-5" />
                        </button>
                     </td>
                   </tr>
                 ))}
                 {records.length === 0 && (
                   <tr>
                     <td colSpan={7} className="px-6 py-10 text-center text-gray-400">暂无记录</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>

           {/* DETAIL MODAL */}
           {viewingRecord && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                   {/* Header */}
                   <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center">
                         <FileText className="w-5 h-5 mr-2 text-blue-600" />
                         诊疗记录详情
                      </h3>
                      <button onClick={() => setViewingRecord(null)} className="text-gray-400 hover:text-gray-600 transition">
                         <X className="w-6 h-6" />
                      </button>
                   </div>

                   {/* Scrollable Content */}
                   <div className="p-6 overflow-y-auto space-y-6">
                      
                      {/* Status Banner */}
                      <div className={`p-4 rounded-xl border ${viewingRecord.status === 'COMPLIANT' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                         <div className="flex items-start">
                            {viewingRecord.status === 'COMPLIANT' ? (
                               <ShieldCheck className="w-6 h-6 text-green-600 mr-3 mt-0.5" />
                            ) : (
                               <ShieldAlert className="w-6 h-6 text-red-600 mr-3 mt-0.5" />
                            )}
                            <div>
                               <h4 className={`font-bold ${viewingRecord.status === 'COMPLIANT' ? 'text-green-800' : 'text-red-800'}`}>
                                  {viewingRecord.status === 'COMPLIANT' ? 'DRG 校验通过 (合规)' : '存在违规风险'}
                               </h4>
                               {viewingRecord.validationMessages.length > 0 && (
                                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                                     {viewingRecord.validationMessages.map((msg, idx) => (
                                        <li key={idx}>{msg}</li>
                                     ))}
                                  </ul>
                               )}
                            </div>
                         </div>
                      </div>

                      {/* Grid Layout for Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         
                         {/* Patient Info */}
                         <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-500 uppercase border-b border-gray-100 pb-2">患者基本信息</h4>
                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                               <div><span className="text-gray-500 block text-xs">姓名</span> <span className="font-medium">{viewingRecord.patientName}</span></div>
                               <div><span className="text-gray-500 block text-xs">证件号</span> <span className="font-mono text-xs">{viewingRecord.patientId}</span></div>
                               <div><span className="text-gray-500 block text-xs">性别/年龄</span> <span>{viewingRecord.gender} / {viewingRecord.age}岁</span></div>
                               <div><span className="text-gray-500 block text-xs">民族</span> <span>{viewingRecord.ethnicity}</span></div>
                               <div className="col-span-2"><span className="text-gray-500 block text-xs">联系电话</span> <span className="font-mono">{viewingRecord.contactNumber}</span></div>
                            </div>
                         </div>

                         {/* Medical History */}
                         <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-500 uppercase border-b border-gray-100 pb-2">病史信息</h4>
                            <div className="space-y-3 text-sm">
                               <div>
                                  <span className="text-gray-500 block text-xs mb-1">过敏史</span>
                                  <div className="bg-gray-50 p-2 rounded text-gray-700">{viewingRecord.allergyHistory || '无'}</div>
                               </div>
                               <div>
                                  <span className="text-gray-500 block text-xs mb-1">既往病史</span>
                                  <div className="bg-gray-50 p-2 rounded text-gray-700">{viewingRecord.pastMedicalHistory || '无'}</div>
                               </div>
                            </div>
                         </div>

                         {/* Clinical Data */}
                         <div className="md:col-span-2 space-y-4">
                            <h4 className="text-sm font-bold text-gray-500 uppercase border-b border-gray-100 pb-2">本次诊疗数据 (DRG: {viewingRecord.diseaseName})</h4>
                            <div className="bg-blue-50/30 rounded-xl p-4 border border-blue-100">
                               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                  {Object.entries(viewingRecord.metrics).map(([key, value]) => {
                                     // Find label from rules if possible
                                     const rule = rules.find(r => r.id === viewingRecord.diseaseId || r.diseaseName === viewingRecord.diseaseName);
                                     const metricDef = rule?.requiredMetrics.find(m => m.key === key);
                                     const label = metricDef?.label || key;
                                     const unit = metricDef?.unit || '';

                                     return (
                                        <div key={key} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                                           <span className="text-xs text-gray-500 block mb-1">{label}</span>
                                           <span className="font-mono font-bold text-gray-800">{value} <span className="text-xs font-normal text-gray-400">{unit}</span></span>
                                        </div>
                                     );
                                  })}
                                  
                                  <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-200 ring-1 ring-blue-50">
                                     <span className="text-xs text-blue-600 block mb-1 font-bold">诊疗总费用</span>
                                     <span className="font-mono font-bold text-blue-700 text-lg">¥{viewingRecord.totalCost}</span>
                                  </div>
                               </div>
                            </div>
                         </div>

                         {/* Meta Info */}
                         <div className="md:col-span-2 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
                            <span>流水号: {viewingRecord.id}</span>
                            <span>提交时间: {new Date(viewingRecord.recordDate).toLocaleString()}</span>
                            <span>责任医生: {viewingRecord.doctorName}</span>
                            <span>所属机构: {viewingRecord.clinicName}</span>
                         </div>

                      </div>
                   </div>

                   {/* Footer */}
                   <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
                      <button 
                         onClick={() => setViewingRecord(null)}
                         className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition shadow-sm"
                      >
                         关闭
                      </button>
                   </div>
                </div>
              </div>
           )}
        </div>
      )}

      {/* 4. RULES ENGINE VIEW */}
      {activeTab === 'rules' && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-blue-800 text-sm flex items-start">
            <ShieldAlert className="w-5 h-5 mr-2 shrink-0" />
            <p>
              <strong>DRG 规则引擎控制台:</strong> 您可以在此实时调整校验参数或接入新的病组规则。修改后的规则将立即推送至所有医生端，即刻生效。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {rules.map(rule => (
               <div key={rule.id} className={`bg-white p-5 rounded-lg shadow-sm border transition-all ${editingRuleId === rule.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'}`}>
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                   <div className="flex-1">
                     <h4 className="text-lg font-bold text-gray-800 flex items-center">
                       {rule.diseaseName} 
                       <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded ml-3 border border-gray-200 font-mono">{rule.drgCode}</span>
                     </h4>
                     
                     <div className="text-sm text-gray-600 mt-2 space-y-1">
                       {editingRuleId === rule.id ? (
                          <div className="flex items-center mt-2 bg-blue-50 p-2 rounded w-fit animate-fade-in">
                              <label className="mr-2 font-bold text-blue-800">设置新限额:</label>
                              <span className="text-gray-500 mr-1">¥</span>
                              <input 
                                type="number" 
                                value={editCost} 
                                onChange={e => setEditCost(parseFloat(e.target.value))}
                                className="border border-blue-300 rounded px-2 py-1 w-24 focus:outline-none focus:border-blue-500"
                              />
                          </div>
                       ) : (
                          <p className="flex items-center text-gray-700">
                             <span className="font-bold mr-2">当前限额:</span> 
                             <span className="font-mono text-lg bg-gray-100 px-1 rounded">¥{rule.maxCost}</span>
                          </p>
                       )}
                       <p className="text-gray-500 text-xs mt-1">
                         <strong>包含必填项:</strong> {rule.requiredMetrics.map(m => m.label).join(', ')}
                       </p>
                     </div>
                   </div>

                   <div className="mt-4 md:mt-0 flex space-x-2">
                     {editingRuleId === rule.id ? (
                        <>
                          <button onClick={saveRule} className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                            <Save className="w-4 h-4 mr-1"/> 保存
                          </button>
                          <button onClick={cancelEdit} className="flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">
                            <X className="w-4 h-4 mr-1"/> 取消
                          </button>
                        </>
                     ) : (
                        <button onClick={() => startEditRule(rule)} className="flex items-center text-gray-400 hover:text-blue-600 px-3 py-2 rounded hover:bg-blue-50 transition border border-transparent hover:border-blue-100">
                           <Settings className="w-4 h-4 mr-1" />
                           调整参数
                        </button>
                     )}
                   </div>
                 </div>
               </div>
            ))}
            
            {!isAddingRule ? (
              <button 
                onClick={() => setIsAddingRule(true)}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition"
              >
                 <Plus className="w-6 h-6 mb-2" />
                 <span className="text-sm font-medium">接入新的 DRG 病组规则</span>
              </button>
            ) : (
              <div className="bg-white rounded-lg shadow-lg border border-blue-200 p-6 animate-fade-in ring-4 ring-blue-50">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                   <h3 className="text-lg font-bold text-gray-800 flex items-center">
                     <Plus className="w-5 h-5 mr-2 text-blue-600" />
                     添加新规则
                   </h3>
                   <button onClick={() => setIsAddingRule(false)} className="text-gray-400 hover:text-gray-600">
                     <X className="w-5 h-5" />
                   </button>
                </div>
                
                <div className="space-y-6">
                   {/* 1. Basic Info */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">疾病名称</label>
                        <input 
                          type="text" 
                          value={newRule.diseaseName}
                          onChange={e => setNewRule({...newRule, diseaseName: e.target.value})}
                          placeholder="例如：社区获得性肺炎"
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DRG 编码</label>
                        <input 
                          type="text" 
                          value={newRule.drgCode}
                          onChange={e => setNewRule({...newRule, drgCode: e.target.value})}
                          placeholder="例如：ET1.9"
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">费用限额 (¥)</label>
                        <input 
                          type="number" 
                          value={newRule.maxCost || ''}
                          onChange={e => setNewRule({...newRule, maxCost: parseFloat(e.target.value)})}
                          placeholder="0.00"
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                   </div>

                   {/* 2. Metrics Config */}
                   <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-gray-700">必填临床指标配置</h4>
                        <button 
                          onClick={handleAddMetric}
                          className="text-xs flex items-center bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3 mr-1" /> 添加指标
                        </button>
                     </div>
                     
                     <div className="space-y-2">
                       {newRule.requiredMetrics?.length === 0 && (
                          <p className="text-xs text-center text-gray-400 py-2">暂无指标，请添加至少一项</p>
                       )}
                       {newRule.requiredMetrics?.map((metric, idx) => (
                         <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200 shadow-sm">
                            <span className="text-xs font-mono text-gray-400 w-6 text-center">{idx + 1}</span>
                            <input 
                               type="text" 
                               placeholder="指标名称 (如: 体温)"
                               value={metric.label}
                               onChange={e => handleMetricChange(idx, 'label', e.target.value)}
                               className="flex-1 p-1.5 text-sm border border-gray-300 rounded focus:outline-blue-500"
                            />
                            <input 
                               type="text" 
                               placeholder="单位"
                               value={metric.unit}
                               onChange={e => handleMetricChange(idx, 'unit', e.target.value)}
                               className="w-20 p-1.5 text-sm border border-gray-300 rounded focus:outline-blue-500"
                            />
                            <input 
                               type="number" 
                               placeholder="Min"
                               value={metric.min || ''}
                               onChange={e => handleMetricChange(idx, 'min', e.target.value)}
                               className="w-20 p-1.5 text-sm border border-gray-300 rounded focus:outline-blue-500"
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                               type="number" 
                               placeholder="Max"
                               value={metric.max || ''}
                               onChange={e => handleMetricChange(idx, 'max', e.target.value)}
                               className="w-20 p-1.5 text-sm border border-gray-300 rounded focus:outline-blue-500"
                            />
                            <button onClick={() => handleRemoveMetric(idx)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                               <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                       ))}
                     </div>
                   </div>

                   <div className="flex justify-end gap-3 pt-2">
                      <button 
                        onClick={() => setIsAddingRule(false)} 
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                      >
                        取消
                      </button>
                      <button 
                        onClick={handleSaveNewRule} 
                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm"
                      >
                        确认添加规则
                      </button>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. USER MANAGEMENT VIEW */}
      {activeTab === 'users' && (
        <div className="animate-fade-in space-y-6">
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center bg-gray-50/50 gap-4">
               <div>
                 <h3 className="font-bold text-gray-800 text-lg flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    系统人员管理
                 </h3>
                 <p className="text-gray-500 text-xs mt-1">查看及管理所有注册医生与管理员账号</p>
               </div>
               
               <button 
                 onClick={() => setIsAddingUser(true)}
                 className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition shadow-sm hover:shadow"
               >
                 <UserPlus className="w-4 h-4 mr-2" /> 添加新医生
               </button>
             </div>

             {/* Add User Form */}
             {isAddingUser && (
                <div className="p-6 bg-blue-50/50 border-b border-blue-100 animate-fade-in">
                   <h4 className="text-sm font-bold text-gray-700 mb-4">录入新医生信息</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                         <label className="block text-xs font-semibold text-gray-500 mb-1">登录用户名</label>
                         <input 
                           type="text"
                           value={newUser.username}
                           onChange={e => setNewUser({...newUser, username: e.target.value})}
                           placeholder="例如: dr_zhang"
                           className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-semibold text-gray-500 mb-1">所属诊所</label>
                         <input 
                           type="text"
                           value={newUser.clinicName}
                           onChange={e => setNewUser({...newUser, clinicName: e.target.value})}
                           placeholder="例如: 阳光社区卫生站"
                           className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                         />
                      </div>
                      <div className="flex items-end gap-2">
                         <button onClick={handleAddUser} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 w-full md:w-auto">
                            确认添加
                         </button>
                         <button onClick={() => setIsAddingUser(false)} className="bg-white text-gray-600 border border-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 w-full md:w-auto">
                            取消
                         </button>
                      </div>
                   </div>
                </div>
             )}

             {/* Users List */}
             <div className="overflow-x-auto">
               <table className="min-w-full text-sm text-left">
                 <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
                   <tr>
                     <th className="px-6 py-4">用户ID</th>
                     <th className="px-6 py-4">登录用户名</th>
                     <th className="px-6 py-4">角色</th>
                     <th className="px-6 py-4">所属机构</th>
                     <th className="px-6 py-4 text-center">状态</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {users.map(u => (
                     <tr key={u.id} className="hover:bg-gray-50 transition">
                       <td className="px-6 py-4 font-mono text-gray-400 text-xs">{u.id.slice(0,8)}...</td>
                       <td className="px-6 py-4 font-bold text-gray-800">{u.username}</td>
                       <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${u.role === Role.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                             {u.role === Role.ADMIN ? '管理员' : '执业医生'}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-gray-600">{u.clinicName}</td>
                       <td className="px-6 py-4 text-center">
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;