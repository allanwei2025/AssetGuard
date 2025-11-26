import React, { useState, useEffect } from 'react';
import { Asset, AssetStatus } from '../types';
import Button from './Button';

interface AssetModalProps {
  asset: Asset;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (photoUrl?: string, notes?: string) => void;
}

const AssetModal: React.FC<AssetModalProps> = ({ asset, isOpen, onClose, onConfirm }) => {
  const [note, setNote] = useState(asset.notes || '');
  const [preview, setPreview] = useState<string | undefined>(asset.photoUrl);

  // Reset state when the asset changes or modal opens
  useEffect(() => {
    if (isOpen) {
        setNote(asset.notes || '');
        setPreview(asset.photoUrl);
    }
  }, [asset, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">
                    {asset.status === AssetStatus.EXTRA ? '发现新资产' : '确认资产'}
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div className="p-6 space-y-4">
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">资产名称</label>
                    <div className="text-xl font-semibold text-slate-900">{asset.name}</div>
                </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">条码</label>
                    <div className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block">
                        {asset.barcode}
                    </div>
                </div>

                {/* Photo Input */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">凭证照片</label>
                    <div className="flex items-center gap-4">
                        <label className="cursor-pointer flex items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition">
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </label>
                        {preview && (
                            <div className="w-20 h-20 rounded-lg border border-slate-200 overflow-hidden relative group">
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                <button onClick={() => setPreview(undefined)} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl shadow">
                                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                    <textarea 
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                        rows={2}
                        placeholder="例如：屏幕损坏，位置错误..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={onClose}>取消</Button>
                <Button variant="primary" className="flex-1" onClick={() => onConfirm(preview, note)}>确认</Button>
            </div>
        </div>
    </div>
  );
};

export default AssetModal;