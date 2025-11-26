import React, { useState } from 'react';
import { Asset, AssetStatus } from '../types';

interface AssetListProps {
  assets: Asset[];
  onAssetClick: (asset: Asset) => void;
}

const AssetList: React.FC<AssetListProps> = ({ assets, onAssetClick }) => {
  const [filter, setFilter] = useState<'ALL' | 'FOUND' | 'PENDING'>('ALL');

  const filteredAssets = assets.filter(a => {
    if (filter === 'ALL') return true;
    if (filter === 'FOUND') return a.status === AssetStatus.FOUND || a.status === AssetStatus.EXTRA;
    if (filter === 'PENDING') return a.status === AssetStatus.PENDING;
    return true;
  });

  const getCount = (f: string) => {
     if (f === 'ALL') return assets.length;
     if (f === 'FOUND') return assets.filter(a => a.status === AssetStatus.FOUND || a.status === AssetStatus.EXTRA).length;
     if (f === 'PENDING') return assets.filter(a => a.status === AssetStatus.PENDING).length;
     return 0;
  };

  const getFilterLabel = (f: string) => {
    switch(f) {
        case 'ALL': return '全部';
        case 'PENDING': return '待盘点';
        case 'FOUND': return '已盘点';
        default: return f;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-t-3xl shadow-top border border-slate-200 mt-4">
      <div className="flex gap-2 p-4 border-b border-slate-100">
        {(['ALL', 'PENDING', 'FOUND'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-xs font-bold rounded-full uppercase tracking-wider relative transition-all ${
              filter === f 
                ? 'bg-slate-800 text-white shadow-md transform scale-105' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {getFilterLabel(f)}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${filter === f ? 'bg-slate-600 text-white' : 'bg-slate-200'}`}>
                {getCount(f)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {filteredAssets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <p>列表为空</p>
            </div>
        )}
        
        {filteredAssets.map(asset => (
          <div 
            key={asset.id}
            onClick={() => onAssetClick(asset)}
            className={`p-4 rounded-xl border flex justify-between items-center cursor-pointer transition-colors active:scale-[0.98] ${
              asset.status === AssetStatus.FOUND 
                ? 'bg-green-50/50 border-green-200' 
                : asset.status === AssetStatus.EXTRA
                    ? 'bg-blue-50/50 border-blue-200'
                    : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold truncate ${asset.status === AssetStatus.PENDING ? 'text-slate-800' : 'text-slate-600'}`}>{asset.name}</h3>
                {asset.status === AssetStatus.FOUND && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold border border-green-200">已盘点</span>
                )}
                 {asset.status === AssetStatus.EXTRA && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold border border-blue-200">新增</span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono flex items-center gap-2">
                <span className="bg-slate-100 px-1 rounded">{asset.barcode}</span>
                {asset.location && <span className="text-slate-300">|</span>}
                {asset.location && <span>{asset.location}</span>}
              </p>
            </div>
            
            <div className="ml-3 flex flex-col items-end gap-1">
                {asset.photoUrl ? (
                    <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden border border-slate-300 shadow-sm">
                        <img src={asset.photoUrl} alt="proof" className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetList;