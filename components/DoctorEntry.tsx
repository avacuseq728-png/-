import React, { useState, useEffect } from 'react';
import { DrgRule, PatientRecord, User } from '../types';
import { StorageService } from '../services/storageService';
import { DrgService } from '../services/drgService';
import { extractClinicalData } from '../services/geminiService';
import { AlertCircle, CheckCircle, Brain, Loader2, AlertTriangle, Info, FileText, ArrowRight, RefreshCw, Phone, User as UserIcon, Calendar, XCircle } from 'lucide-react';

interface Props {
  user: User;
}

interface AiFeedback {
  success: boolean;
  missingFields: string[];
  outOfRangeFields: string[];
  message: string;
}

const DoctorEntry: React.FC<Props> = ({ user }) => {
  const [rules, setRules] = useState<DrgRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  
  // Form State
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]); // Default to today YYYY-MM-DD
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientAge, setPatientAge] = useState<number | ''>('');
  const [patientGender, setPatientGender] = useState('男');
  const [patientEthnicity, setPatientEthnicity] = useState(''); // New State
  const [patientPhone, setPatientPhone] = useState('');
  const [allergyHistory, setAllergyHistory] = useState(''); // New State
  const [pastMedicalHistory, setPastMedicalHistory] = useState(''); // New State

  const [cost, setCost] = useState<number | ''>('');
  const [metrics, setMetrics] = useState<Record<string, number | string>>({});
  const [clinicalNote, setClinicalNote] = useState('');
  
  // UI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submittedRecord, setSubmittedRecord] = useState<PatientRecord | null>(null);
  const [aiFeedback, setAiFeedback] = useState<AiFeedback | null>(null);

  useEffect(() => {
    setRules(StorageService.getRules());
  }, []);

  const selectedRule = rules.find(r => r.id === selectedRuleId);

  // Reset metrics when rule changes
  useEffect(() => {
    if (selectedRule) {
      const initialMetrics: Record<string, ''> = {};
      selectedRule.requiredMetrics.forEach(m => initialMetrics[m.key] = '');
      setMetrics(initialMetrics);
      setErrors([]);
      setSubmittedRecord(null);
      setAiFeedback(null);
    }
  }, [selectedRule]);

  const handleAiExtract = async () => {
    if (!selectedRule || !clinicalNote) return;
    setIsAiLoading(true);
    setErrors([]);
    setAiFeedback(null);
    
    try {
      const extracted = await extractClinicalData(clinicalNote, selectedRule);
      if (extracted) {
        // Update form values
        setMetrics(prev => {
          const next = { ...prev };
          Object.keys(extracted).forEach(key => {
            if (key !== 'cost' && extracted[key] !== null) {
              next[key] = extracted[key];
            }
          });
          return next;
        });
        
        if (extracted.cost) {
            setCost(extracted.cost);
        }

        // Analyze and generate detailed feedback
        const missing: string[] = [];
        const outOfRange: string[] = [];
        
        selectedRule.requiredMetrics.forEach(m => {
          const val = extracted[m.key];
          if (val === undefined || val === null) {
            missing.push(m.label);
          } else {
            if (val < m.min || val > m.max) {
              outOfRange.push(`${m.label} (${val})`);
            }
          }
        });

        // Determine cost status for feedback
        if (extracted.cost && extracted.cost > selectedRule.maxCost) {
            outOfRange.push(`诊疗费用 (${extracted.cost})`);
        }

        const isSuccess = missing.length === 0 && outOfRange.length === 0;

        setAiFeedback({
          success: isSuccess,
          missingFields: missing,
          outOfRangeFields: outOfRange,
          message: isSuccess 
            ? "AI 已成功提取所有必要指标，且数据均在合理范围内。" 
            : "AI 提取完成，但发现部分数据缺失或异常，请人工复核。"
        });

      } else {
          setErrors(['AI 无法在笔记中识别相关数据，请尝试手动输入。']);
      }
    } catch (e) {
      setErrors(['无法连接到 AI 服务。']);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;

    const numMetrics: Record<string, number> = {};
    let validConversion = true;
    
    Object.keys(metrics).forEach(key => {
      const val = parseFloat(metrics[key] as string);
      if (isNaN(val)) validConversion = false;
      numMetrics[key] = val;
    });

    const numCost = parseFloat(cost as string);
    const numAge = typeof patientAge === 'string' ? parseInt(patientAge) : patientAge;

    if (!validConversion || isNaN(numCost) || isNaN(numAge) || !numAge) {
      setErrors(['请正确填写所有数值字段（含年龄、费用）。']);
      return;
    }

    if (!patientEthnicity.trim()) {
      setErrors(['请填写患者民族。']);
      return;
    }

    const validation = DrgService.validateRecord(selectedRule, numMetrics, numCost);

    if (!validation.isValid) {
      setErrors(validation.messages);
      return;
    }

    const newRecord: PatientRecord = {
      id: crypto.randomUUID(),
      recordDate: new Date(visitDate).toISOString(), // Use selected date
      doctorName: user.username,
      clinicName: user.clinicName,
      patientName,
      patientId,
      age: numAge,
      gender: patientGender,
      ethnicity: patientEthnicity,
      contactNumber: patientPhone,
      allergyHistory: allergyHistory,
      pastMedicalHistory: pastMedicalHistory,
      diseaseId: selectedRule.id,
      diseaseName: selectedRule.diseaseName,
      metrics: numMetrics,
      totalCost: numCost,
      status: 'COMPLIANT',
      validationMessages: []
    };

    StorageService.addRecord(newRecord);
    setSubmittedRecord(newRecord); // Switch to Success View
    setErrors([]);
    setAiFeedback(null);
  };

  const handleReset = () => {
    setSubmittedRecord(null);
    setVisitDate(new Date().toISOString().split('T')[0]);
    setPatientName('');
    setPatientId('');
    setPatientAge('');
    setPatientGender('男');
    setPatientEthnicity('');
    setPatientPhone('');
    setAllergyHistory('');
    setPastMedicalHistory('');
    setCost('');
    setClinicalNote('');
    setAiFeedback(null);
    if (selectedRule) {
      const initialMetrics: Record<string, ''> = {};
      selectedRule.requiredMetrics.forEach(m => initialMetrics[m.key] = '');
      setMetrics(initialMetrics);
    }
  };

  // --- Real-time Validation Helpers ---
  const getFieldStatus = (key: string, value: number | string) => {
    if (value === '') return 'neutral';
    const numVal = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numVal)) return 'error';

    const metricRule = selectedRule?.requiredMetrics.find(m => m.key === key);
    if (!metricRule) return 'neutral';

    if (numVal < metricRule.min || numVal > metricRule.max) return 'error';
    return 'success';
  };

  const getCostStatus = (currentCost: number | '') => {
    if (currentCost === '' || !selectedRule) return 'neutral';
    const num = typeof currentCost === 'string' ? parseFloat(currentCost) : currentCost;
    if (isNaN(num)) return 'neutral';
    
    if (num > selectedRule.maxCost) return 'error';
    if (num > selectedRule.maxCost * 0.8) return 'warning';
    return 'success';
  };

  const costStatus = getCostStatus(cost);
  const costPercentage = selectedRule && typeof cost === 'number' 
    ? Math.min((cost / selectedRule.maxCost) * 100, 100) 
    : 0;

  // --- Success View (Audit Report) ---
  if (submittedRecord && selectedRule) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in-up">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
           <div className="h-2 bg-green-500 w-full"></div>
           <div className="p-8 text-center border-b border-gray-100">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <CheckCircle className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-bold text-gray-800">DRG 校验通过</h2>
             <p className="text-gray-500 mt-1">数据已加密存证，符合医保合规要求</p>
           </div>
           
           <div className="bg-gray-50 p-6 space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-3">
                 <span className="text-gray-500">审计单号</span>
                 <span className="font-mono font-medium text-gray-700">{submittedRecord.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-3">
                 <span className="text-gray-500">就诊日期</span>
                 <span className="font-medium text-gray-800">{submittedRecord.recordDate.split('T')[0]}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-3">
                 <span className="text-gray-500">DRG 分组</span>
                 <span className="font-medium text-gray-800">{selectedRule.drgCode} - {selectedRule.diseaseName}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-3">
                 <span className="text-gray-500">患者信息</span>
                 <span className="font-medium text-gray-800">
                    {patientName} ({submittedRecord.gender}, {submittedRecord.age}岁, {submittedRecord.ethnicity})
                    <br/>
                    <span className="text-gray-400 text-xs font-normal">ID: {patientId} | ℡ {submittedRecord.contactNumber}</span>
                 </span>
              </div>
              <div className="flex justify-between items-center text-sm pb-1">
                 <span className="text-gray-500">申报费用</span>
                 <span className="font-bold text-xl text-gray-800">¥{submittedRecord.totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                 <span>DRG 限额标准</span>
                 <span>¥{selectedRule.maxCost.toFixed(2)}</span>
              </div>
           </div>

           <div className="p-6">
             <button 
               onClick={handleReset}
               className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center shadow-md hover:shadow-lg"
             >
               <RefreshCw className="w-4 h-4 mr-2" />
               录入下一位患者
             </button>
           </div>
        </div>
      </div>
    );
  }

  // --- Entry Form View ---
  return (
    <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="bg-blue-600 w-1.5 h-8 mr-3 rounded-full"></span>
        诊疗数据录入
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Basic Info Section */}
        <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center">
             <UserIcon className="w-4 h-4 mr-2 text-blue-500"/> 患者基础信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">姓名</label>
              <input 
                required
                type="text" 
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="患者姓名"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">就诊日期</label>
              <div className="relative">
                <input 
                  required
                  type="date" 
                  value={visitDate}
                  onChange={e => setVisitDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">身份证号 / 医保卡号</label>
              <input 
                required
                type="text" 
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="证件号码"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                 <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">性别</label>
                 <select
                   value={patientGender}
                   onChange={e => setPatientGender(e.target.value)}
                   className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                 >
                   <option value="男">男</option>
                   <option value="女">女</option>
                 </select>
              </div>
              <div className="col-span-1">
                 <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">年龄</label>
                 <div className="relative">
                   <input 
                    required
                    type="number" 
                    min="0"
                    max="120"
                    value={patientAge}
                    onChange={e => setPatientAge(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400 text-sm">岁</span>
                 </div>
              </div>
              <div>
                 <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">民族</label>
                 <input 
                    required
                    type="text" 
                    value={patientEthnicity}
                    onChange={e => setPatientEthnicity(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="如: 汉族"
                  />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">联系电话</label>
              <div className="relative">
                <input 
                  required
                  type="tel" 
                  value={patientPhone}
                  onChange={e => setPatientPhone(e.target.value)}
                  className="w-full p-2.5 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="手机号码"
                />
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* New Medical History Fields */}
            <div className="md:col-span-2">
               <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">过敏史</label>
               <input 
                  type="text"
                  value={allergyHistory}
                  onChange={e => setAllergyHistory(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="无，或注明过敏药物/食物"
               />
            </div>
            
            <div className="md:col-span-2">
               <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">既往病史</label>
               <textarea 
                  rows={2}
                  value={pastMedicalHistory}
                  onChange={e => setPastMedicalHistory(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                  placeholder="无，或注明重要既往病史（如高血压、糖尿病、手术史等）"
               />
            </div>

          </div>
        </div>

        {/* Disease Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">诊断疾病 (DRG分组)</label>
          <div className="relative">
            <select 
              required
              value={selectedRuleId}
              onChange={e => setSelectedRuleId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition appearance-none"
            >
              <option value="">-- 请选择诊断 --</option>
              {rules.filter(r => r.isActive).map(r => (
                <option key={r.id} value={r.id}>{r.drgCode} - {r.diseaseName}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>

        {selectedRule && (
          <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 animate-fade-in space-y-6">
            
            {/* AI Assistant Section */}
            <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-200">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-blue-800 flex items-center">
                  <Brain className="w-4 h-4 mr-2" />
                  AI 智能填报助手
                </label>
                <button
                  type="button"
                  onClick={handleAiExtract}
                  disabled={!clinicalNote || isAiLoading}
                  className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 flex items-center transition shadow-sm"
                >
                  {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Brain className="w-3 h-3 mr-1"/>}
                  提取数据
                </button>
              </div>
              <textarea 
                value={clinicalNote}
                onChange={e => setClinicalNote(e.target.value)}
                placeholder="尝试粘贴临床笔记，例如：'患者张三，确诊原发性高血压。今日收缩压130，舒张压85，开具降压药费用120元。' 系统将自动提取数据。"
                className="w-full text-sm p-3 border border-gray-200 rounded-md h-24 focus:ring-0 focus:outline-none resize-none placeholder-gray-400"
              />
            
              {/* AI Feedback Panel */}
              {aiFeedback && (
                <div className={`mt-3 p-3 rounded-lg border text-sm animate-fade-in ${aiFeedback.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                   <div className="flex items-start">
                     {aiFeedback.success ? <CheckCircle className="w-4 h-4 mr-2 mt-0.5" /> : <AlertCircle className="w-4 h-4 mr-2 mt-0.5" />}
                     <div>
                       <p className="font-bold">{aiFeedback.message}</p>
                       
                       {(aiFeedback.missingFields.length > 0 || aiFeedback.outOfRangeFields.length > 0) && (
                         <div className="mt-2 text-xs space-y-1">
                            {aiFeedback.missingFields.length > 0 && (
                               <p className="flex items-center"><span className="font-semibold mr-1">未找到:</span> {aiFeedback.missingFields.join(', ')}</p>
                            )}
                            {aiFeedback.outOfRangeFields.length > 0 && (
                               <p className="flex items-center"><span className="font-semibold mr-1">数值异常:</span> {aiFeedback.outOfRangeFields.join(', ')}</p>
                            )}
                         </div>
                       )}
                     </div>
                   </div>
                </div>
              )}
            </div>

            <div className="border-t border-blue-200 pt-4">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                <Info className="w-4 h-4 mr-2 text-blue-500"/>
                DRG 必填指标 (由 {selectedRule.drgCode} 规则定义)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {selectedRule.requiredMetrics.map(metric => {
                  const status = getFieldStatus(metric.key, metrics[metric.key]);
                  let borderColor = 'border-gray-300';
                  let icon = null;
                  
                  if (status === 'success') {
                    borderColor = 'border-green-500 bg-green-50/30';
                    icon = <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-500" />;
                  } else if (status === 'error') {
                    borderColor = 'border-red-500 bg-red-50/30';
                    icon = <AlertTriangle className="absolute right-3 top-3 w-5 h-5 text-red-500" />;
                  }

                  return (
                    <div key={metric.key} className="relative group">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                        {metric.label} <span className="text-gray-400 font-normal">({metric.unit})</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={metrics[metric.key]}
                          onChange={(e) => setMetrics(prev => ({...prev, [metric.key]: e.target.value}))}
                          className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none transition ${borderColor}`}
                          placeholder={`${metric.min} - ${metric.max}`}
                        />
                        {icon}
                      </div>
                      {status === 'error' && (
                        <p className="text-xs text-red-600 mt-1 font-medium animate-pulse">
                          超出合理范围 ({metric.min}-{metric.max})，请复核
                        </p>
                      )}
                    </div>
                  );
                })}
                
                {/* Cost Field with Progress Bar */}
                <div className="relative sm:col-span-2 bg-white p-5 rounded-lg border border-gray-200 shadow-sm mt-2">
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex justify-between items-center">
                    <span>本次诊疗总费用 (元)</span>
                    <span className={`text-xs px-2 py-1 rounded ${costStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      DRG限额标准: ¥{selectedRule.maxCost}
                    </span>
                  </label>
                  
                  <div className="relative mb-3">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-serif text-lg">¥</span>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={cost}
                      onChange={e => setCost(e.target.value ? parseFloat(e.target.value) : '')}
                      className={`w-full pl-8 p-2.5 border rounded-lg focus:ring-4 focus:outline-none transition font-mono text-xl font-medium
                        ${costStatus === 'error' ? 'border-red-500 text-red-600 focus:ring-red-100' : 
                          costStatus === 'warning' ? 'border-yellow-500 text-gray-800 focus:ring-yellow-100' : 'border-gray-300 text-gray-800 focus:ring-blue-100'}`}
                    />
                    {costStatus === 'error' && <AlertTriangle className="absolute right-3 top-3.5 w-5 h-5 text-red-500" />}
                    {costStatus === 'success' && <CheckCircle className="absolute right-3 top-3.5 w-5 h-5 text-green-500" />}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-700 ease-out ${
                        costStatus === 'error' ? 'bg-red-500' : 
                        costStatus === 'warning' ? 'bg-yellow-400' : 'bg-gradient-to-r from-green-400 to-green-500'
                      }`} 
                      style={{ width: `${Math.min(costPercentage, 100)}%` }}
                    ></div>
                  </div>
                  {costStatus === 'error' && (
                     <p className="text-xs text-red-600 mt-2 font-bold flex items-center">
                       <AlertCircle className="w-3 h-3 mr-1"/>
                       警告：已超出支付标准 ¥{(Number(cost) - selectedRule.maxCost).toFixed(2)}，可能触发医保拒付！
                     </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Error Message (On Submit) */}
        {errors.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-pulse shadow-sm">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">校验未通过</p>
                <ul className="list-disc list-inside text-sm text-red-700 mt-1 space-y-1">
                  {errors.map((err, idx) => <li key={idx}>{err}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button 
            type="submit"
            disabled={!selectedRule}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform active:scale-[0.99] duration-200 flex items-center justify-center text-lg"
          >
            提交并进行 DRG 校验
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default DoctorEntry;