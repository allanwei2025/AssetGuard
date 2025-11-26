import React, { useState, useMemo, useCallback } from 'react';
import { Asset, AssetStatus, AppStep } from './types';
import Button from './components/Button';
import Scanner from './components/Scanner';
import AssetList from './components/AssetList';
import AssetModal from './components/AssetModal';
import { generateInventoryReport } from './services/geminiService';

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
    try {
        const audio = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');
        audio.play().catch(() => {}); // Ignore interaction errors
    } catch (e) {}
  };

  // --- Actions ---

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;

        // Simple CSV Parser (Assumes header row)
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        // Remove header if it exists (simple check if first line contains 'Code' or 'Barcode' or '条码')
        const hasHeader = lines[0].includes('条码') || lines[0].includes('Barcode') || lines[0].includes('Code');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        const parsed: Asset[] = dataLines.map((line, idx) => {
            // Very basic CSV split, handling quotes would require a library like PapaParse, 
            // but for this lightweight app we assume standard comma separation
            const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
            
            // Expected Format: Name, Barcode, Location, Serial
            const name = cols[0] || '未知物品';
            const barcode = cols[1] || `UNKNOWN-${idx}`;
            const location = cols[2] || '';
            const serialNumber = cols[3] || '';

            return {
                id: `import-${idx}-${Date.now()}`,
                name,
                barcode,
                location,
                serialNumber,
                status: AssetStatus.PENDING
            };
        });

        if (parsed.length > 0) {
            setAssets(parsed);
            setStep('AUDIT');
        } else {
            alert('文件解析失败或为空，请检查 CSV 格式。');
        }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
      const csvContent = "资产名称,资产条码,存放位置,序列号\n办公椅,CH-001,101室,SN8833\n显示器,MN-202,101室,DELL-999";
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "inventory_template.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleScanSuccess = useCallback((decodedText: string) => {
    if (scannedCode === decodedText) return;
    setScannedCode(decodedText);
    playBeep();
    
    // Logic: Find asset
    const existingAsset = assets.find(a => a.barcode === decodedText);
    
    // Stop scanning temporarily while modal is open to save battery/performance
    setIsScanning(false);

    if (existingAsset) {
      setSelectedAsset(existingAsset);
      setIsDetailOpen(true);
    } else {
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
    }

    // Reset scan debouncer
    setTimeout(() => setScannedCode(null), 3000);
  }, [assets, scannedCode]);

  const confirmAsset = (photoUrl?: string, notes?: string) => {
    if (!selectedAsset) return;

    setAssets(prev => {
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
  };

  const handleDeleteAsset = (asset: Asset) => {
    if (asset.status !== AssetStatus.EXTRA) return;
    
    if (window.confirm(`确认删除新增资产 "${asset.name}" (${asset.barcode}) 吗？`)) {
        setAssets(prev => prev.filter(a => a.id !== asset.id));
    }
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
    
    // Add BOM for Excel Chinese character support
    const bom = '\uFEFF';
    const csvContent = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Render Steps ---

  const renderImport = () => (
    <div className="p-6 flex flex-col h-full justify-center items-center text-center space-y-8 animate-fade-in relative">
        <div className="bg-blue-100 p-6 rounded-full shadow-inner">
            <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <div>
            <h2 className="text-2xl font-bold text-slate-800">资产盘点助手</h2>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto text-sm">导入 .CSV 格式的资产清单文件以开始盘点工作。</p>
        </div>
        
        <div className="w-full max-w-xs space-y-4">
            <label className="block">
                <span className="sr-only">选择文件</span>
                <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-3 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    cursor-pointer shadow-sm border border-slate-200 rounded-full
                    "
                />
            </label>
            
            <button 
                onClick={downloadTemplate}
                className="text-xs text-slate-400 hover:text-blue-600 underline"
            >
                下载 CSV 示例模板
            </button>
        </div>

        <div className="absolute bottom-6 text-[10px] text-slate-300">
            Powered by Gemini 2.5 AI
        </div>
    </div>
  );

  const renderAudit = () => (
    <div className="flex flex-col h-screen relative bg-slate-50">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 pt-6 pb-8 rounded-b-[2rem] shadow-xl z-10 shrink-0">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold tracking-tight">盘点进行中</h1>
                <button 
                    onClick={() => {
                        if(window.confirm('确定要结束盘点并生成报告吗？')) {
                            setStep('EXPORT');
                        }
                    }} 
                    className="text-xs bg-slate-700 hover:bg-slate-600 px-4 py-1.5 rounded-full transition font-medium border border-slate-600"
                >
                    结束盘点
                </button>
            </div>
            
            <div className="flex items-center justify-between text-sm mb-2 opacity-90">
                <span>进度</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-xs">{stats.found} / {stats.total}</span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                    className="bg-blue-500 h-full transition-all duration-500 ease-out relative" 
                    style={{ width: `${progressPercentage}%` }}
                >
                    {progressPercentage > 0 && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30 animate-pulse"></div>}
                </div>
            </div>
        </div>

        {/* Scanner Area - Height Reduced */}
        <div className="px-4 -mt-6 z-0 shrink-0">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="p-2 border-b flex justify-between items-center bg-slate-50">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        摄像头
                    </span>
                    <button 
                        onClick={() => setIsScanning(!isScanning)} 
                        className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${
                            isScanning 
                                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                        }`}
                    >
                        {isScanning ? '关闭' : '开启'}
                    </button>
                </div>
                {/* Scanner Component with Reduced Height (h-48 = 192px) */}
                <div className="h-48 bg-black relative">
                     <Scanner 
                        isScanning={isScanning} 
                        onScanSuccess={handleScanSuccess} 
                        onStop={() => setIsScanning(false)}
                    />
                </div>
                <div className="p-1 bg-slate-50 border-t text-center">
                    <button 
                        onClick={() => setShowManualAdd(true)}
                        className="text-[10px] text-slate-500 font-medium hover:text-slate-800 underline decoration-slate-300 underline-offset-2"
                    >
                        手动输入条码
                    </button>
                </div>
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-hidden relative">
            <AssetList 
                assets={assets} 
                onAssetClick={(a) => { setSelectedAsset(a); setIsDetailOpen(true); setIsScanning(false); }} 
                onDelete={handleDeleteAsset}
            />
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
                        AI 智能分析报告
                    </h3>
                    {!aiReport && (
                         <button 
                            onClick={handleGenerateReport} 
                            disabled={isGeneratingReport}
                            className="text-xs bg-purple-600 text-white px-4 py-2 rounded-full font-bold hover:bg-purple-700 transition disabled:opacity-50 shadow-lg shadow-purple-500/20"
                        >
                            {isGeneratingReport ? 'AI 思考中...' : '生成摘要'}
                        </button>
                    )}
                </div>
                
                {aiReport ? (
                    <div className="prose prose-sm text-slate-600 bg-purple-50 p-4 rounded-lg border border-purple-100 animate-fade-in">
                        <p className="whitespace-pre-line leading-relaxed">{aiReport}</p>
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded border border-dashed border-slate-200">
                        点击上方按钮，让 AI 助手为您分析本次盘点的异常情况、丢失模式并提供改进建议。
                    </p>
                )}
            </div>

            <div className="space-y-3">
                <Button fullWidth onClick={downloadCSV} variant="primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    下载 Excel/CSV 报告
                </Button>
                <Button fullWidth onClick={() => { setAssets([]); setStep('IMPORT'); setAiReport(''); }} variant="outline">
                    开始新的盘点
                </Button>
            </div>
        </div>
    </div>
  );

  const renderManualEntryModal = () => {
      if(!showManualAdd) return null;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl animate-slide-up">
                <h3 className="font-bold text-lg mb-4 text-slate-800">手动录入资产</h3>
                <p className="text-sm text-slate-500 mb-4">如果条码破损无法扫描，请手动输入。</p>
                <input 
                    type="text" 
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="输入条码 或 序列号"
                    className="w-full border border-slate-300 rounded-lg p-3 mb-4 text-lg font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                />
                <div className="flex gap-2">
                    <Button fullWidth variant="secondary" onClick={() => setShowManualAdd(false)}>取消</Button>
                    <Button fullWidth variant="primary" onClick={handleManualAdd}>确认</Button>
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