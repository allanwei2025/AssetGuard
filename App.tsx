import React, { useState, useMemo, useCallback } from 'react';
import { Asset, AssetStatus, AppStep } from './types';
import Button from './components/Button';
import Scanner from './components/Scanner';
import AssetList from './components/AssetList';
import AssetModal from './components/AssetModal';
import { generateInventoryReport } from './services/geminiService';

const SAMPLE_CSV = `Name,Barcode,Location,Serial
办公椅,CH-001,101室,SN8833
戴尔显示器,MN-202,101室,DELL-999
苹果笔记本 Pro,LT-303,102室,MBP-2023
升降办公桌,DK-404,102室,ST-555
投影仪,PR-505,会议室A,EPSON-777
白板,WB-606,会议室A,WB-001`;

export default function App() {
  const [step, setStep] = useState<AppStep>('IMPORT');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  
  // Modal State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // AI Report State
  const [aiReport, setAiReport] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Stats
  const stats = useMemo(() => {
    return {
      total: assets.length,
      found: assets.filter(a => a.status !== AssetStatus.PENDING).length,
      pending: assets.filter(a => a.status === AssetStatus.PENDING).length
    };
  }, [assets]);

  const progressPercentage = stats.total > 0 ? Math.round((stats.found / stats.total) * 100) : 0;

  // Sound
  const playBeep = () => {
    const audio = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');
    audio.play().catch(e => console.log('Audio play failed', e));
  };

  // --- Actions ---

  const handleImport = () => {
    const lines = SAMPLE_CSV.trim().split('\n');
    const parsed: Asset[] = lines.slice(1).map((line, idx) => {
      const [name, barcode, location, serialNumber] = line.split(',');
      return {
        id: `import-${idx}-${Date.now()}`,
        name: name?.trim() || '未知物品',
        barcode: barcode?.trim() || 'NO-BARCODE',
        location: location?.trim(),
        serialNumber: serialNumber?.trim(),
        status: AssetStatus.PENDING
      };
    });
    setAssets(parsed);
    setStep('AUDIT');
  };

  const handleScanSuccess = useCallback((decodedText: string) => {
    // Prevent duplicate processing in short windows
    if (scannedCode === decodedText) return;
    setScannedCode(decodedText);
    
    // Logic: Find asset
    const existingAsset = assets.find(a => a.barcode === decodedText);
    
    if (existingAsset) {
      if (existingAsset.status !== AssetStatus.PENDING) {
        // Already found
        // Optional: notify user it's duplicate scan
        return; 
      }
      playBeep();
      // Open detail to confirm/take photo
      setSelectedAsset(existingAsset);
      setIsDetailOpen(true);
      setIsScanning(false);
    } else {
      playBeep();
      // New Asset Logic
      const newAsset: Asset = {
        id: `extra-${Date.now()}`,
        name: '新物品',
        barcode: decodedText,
        status: AssetStatus.EXTRA,
        location: '未知位置'
      };
      setSelectedAsset(newAsset);
      setIsDetailOpen(true);
      setIsScanning(false);
    }

    // Reset scan debouncer after a bit
    setTimeout(() => setScannedCode(null), 3000);
  }, [assets, scannedCode]);

  const confirmAsset = (photoUrl?: string, notes?: string) => {
    if (!selectedAsset) return;

    setAssets(prev => {
        // If it exists in list, update it
        const idx = prev.findIndex(a => a.id === selectedAsset.id);
        if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { 
                ...updated[idx], 
                status: AssetStatus.FOUND, 
                photoUrl: photoUrl || updated[idx].photoUrl,
                notes: notes || updated[idx].notes,
                scanTimestamp: Date.now()
            };
            return updated;
        } else {
            // It's a new extra asset, add it
            return [...prev, {
                ...selectedAsset,
                status: AssetStatus.EXTRA,
                photoUrl,
                notes,
                scanTimestamp: Date.now()
            }];
        }
    });

    setIsDetailOpen(false);
    setSelectedAsset(null);
    // Do not auto restart scanner, let user decide
  };

  const handleManualAdd = () => {
    if(!manualCode) return;
    handleScanSuccess(manualCode);
    setManualCode('');
    setShowManualAdd(false);
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    const report = await generateInventoryReport(assets);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  const downloadCSV = () => {
    const headers = ['资产名称', '条码', '状态', '位置', '备注', '时间戳'];
    const rows = assets.map(a => [
        `"${a.name}"`, 
        `"${a.barcode}"`, 
        a.status === AssetStatus.FOUND ? '已盘点' : a.status === AssetStatus.EXTRA ? '新增' : '未盘点', 
        `"${a.location || ''}"`, 
        `"${a.notes || ''}"`,
        a.scanTimestamp ? new Date(a.scanTimestamp).toLocaleString('zh-CN') : ''
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "inventory_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Render Steps ---

  const renderImport = () => (
    <div className="p-6 flex flex-col h-full justify-center items-center text-center space-y-8 animate-fade-in">
        <div className="bg-blue-100 p-6 rounded-full">
            <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <div>
            <h2 className="text-2xl font-bold text-slate-800">开始盘点</h2>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto">导入资产清单以开始扫描。</p>
        </div>
        <div className="w-full max-w-xs space-y-4">
            <Button fullWidth onClick={handleImport}>
                加载演示数据 (CSV)
            </Button>
            <div className="text-xs text-slate-400">
                在实际应用中，这里将打开文件选择器。
            </div>
        </div>
    </div>
  );

  const renderAudit = () => (
    <div className="flex flex-col h-screen relative">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 pt-6 pb-8 rounded-b-[2rem] shadow-xl z-10">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold tracking-tight">盘点进行中</h1>
                <button onClick={() => setStep('EXPORT')} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full transition">完成</button>
            </div>
            
            <div className="flex items-center justify-between text-sm mb-2 opacity-90">
                <span>进度</span>
                <span className="font-mono">{stats.found} / {stats.total}</span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                    className="bg-blue-500 h-full transition-all duration-500 ease-out" 
                    style={{ width: `${progressPercentage}%` }}
                />
            </div>
        </div>

        {/* Scanner Area */}
        <div className="bg-slate-100 p-4 -mt-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="p-3 border-b flex justify-between items-center bg-slate-50">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">扫描器</span>
                    <button 
                        onClick={() => setIsScanning(!isScanning)} 
                        className={`text-xs px-2 py-1 rounded border ${isScanning ? 'border-red-200 text-red-600 bg-red-50' : 'border-blue-200 text-blue-600 bg-blue-50'}`}
                    >
                        {isScanning ? '停止' : '开始'}
                    </button>
                </div>
                {/* Scanner Component */}
                <div className="h-64 bg-black relative">
                     <Scanner isScanning={isScanning} onScanSuccess={handleScanSuccess} />
                </div>
                <div className="p-2 bg-white text-center">
                    <button 
                        onClick={() => setShowManualAdd(true)}
                        className="text-sm text-blue-600 font-medium hover:underline"
                    >
                        手动输入条码
                    </button>
                </div>
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-hidden relative bg-slate-50">
            <AssetList assets={assets} onAssetClick={(a) => { setSelectedAsset(a); setIsDetailOpen(true); setIsScanning(false); }} />
        </div>
    </div>
  );

  const renderExport = () => (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
        <div className="bg-white p-6 shadow-sm border-b sticky top-0 z-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">盘点结束</h2>
            <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-slate-50 rounded-lg border">
                    <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                    <div className="text-xs text-slate-500 uppercase">总数</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="text-2xl font-bold text-green-600">{stats.found}</div>
                    <div className="text-xs text-green-600 uppercase">已盘点</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="text-2xl font-bold text-red-600">{stats.pending}</div>
                    <div className="text-xs text-red-600 uppercase">未盘点</div>
                </div>
            </div>
        </div>

        <div className="p-6 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        AI 智能分析
                    </h3>
                    {!aiReport && (
                         <button 
                            onClick={handleGenerateReport} 
                            disabled={isGeneratingReport}
                            className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full font-bold hover:bg-purple-200 transition disabled:opacity-50"
                        >
                            {isGeneratingReport ? '分析中...' : '生成报告'}
                        </button>
                    )}
                </div>
                
                {aiReport ? (
                    <div className="prose prose-sm text-slate-600 bg-purple-50 p-4 rounded-lg border border-purple-100">
                        <p className="whitespace-pre-line">{aiReport}</p>
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 italic">生成 AI 摘要以识别缺失资产的模式并获取建议。</p>
                )}
            </div>

            <Button fullWidth onClick={downloadCSV} variant="primary">
                下载 CSV 报告
            </Button>
             <Button fullWidth onClick={() => setStep('IMPORT')} variant="outline">
                开始新的盘点
            </Button>
        </div>
    </div>
  );

  const renderManualEntryModal = () => {
      if(!showManualAdd) return null;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <div className="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl">
                <h3 className="font-bold text-lg mb-4">手动录入</h3>
                <input 
                    type="text" 
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="输入条码 / 序列号"
                    className="w-full border border-slate-300 rounded-lg p-3 mb-4 text-lg font-mono uppercase"
                    autoFocus
                />
                <div className="flex gap-2">
                    <Button fullWidth variant="secondary" onClick={() => setShowManualAdd(false)}>取消</Button>
                    <Button fullWidth variant="primary" onClick={handleManualAdd}>提交</Button>
                </div>
             </div>
        </div>
      )
  }

  // --- Main Layout ---

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-slate-50 relative shadow-2xl overflow-hidden flex flex-col font-sans">
      {step === 'IMPORT' && renderImport()}
      {step === 'AUDIT' && renderAudit()}
      {step === 'EXPORT' && renderExport()}

      {/* Modal - Rendered via dedicated component to fix hook error */}
      {isDetailOpen && selectedAsset && (
        <AssetModal 
            asset={selectedAsset} 
            isOpen={isDetailOpen} 
            onClose={() => setIsDetailOpen(false)} 
            onConfirm={confirmAsset} 
        />
      )}
      
      {renderManualEntryModal()}
    </div>
  );
}