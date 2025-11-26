import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerProps {
  onScanSuccess: (decodedText: string, decodedResult: any) => void;
  isScanning: boolean;
  onStop: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, isScanning, onStop }) => {
  const regionId = "html5qr-code-full-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current.clear();
      }
    };
  }, []);

  // Handle start/stop based on prop
  useEffect(() => {
    if (isScanning && !active) {
        startCamera();
    } else if (!isScanning && active) {
        stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  const startCamera = async () => {
    setCameraError(null);
    try {
        if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(regionId);
        }

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [ 
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13 
            ]
        };

        await scannerRef.current.start(
            { facingMode: "environment" }, // Prefer back camera
            config,
            (decodedText, decodedResult) => {
                onScanSuccess(decodedText, decodedResult);
            },
            (errorMessage) => {
                // Ignore parse errors, they are noisy
            }
        );
        setActive(true);
    } catch (err) {
        console.error("Camera start error:", err);
        setCameraError("无法启动相机。请确保已在浏览器设置中允许访问相机，且使用的是 HTTPS 或本地 localhost 环境。");
        onStop(); // Notify parent to turn off switch
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && active) {
        try {
            await scannerRef.current.stop();
            scannerRef.current.clear();
            setActive(false);
        } catch (err) {
            console.error("Failed to stop scanner", err);
        }
    }
  };

  return (
    <div className="w-full relative bg-black rounded-lg overflow-hidden">
        {/* The visual container for the video stream */}
        <div id={regionId} className="w-full min-h-[300px] bg-black"></div>

        {/* Overlay when not active or error */}
        {!active && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-4">
                <svg className="w-12 h-12 text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <p className="text-sm text-slate-400 text-center">点击上方“开启扫描”按钮启动摄像头</p>
                <p className="text-xs text-slate-600 mt-2">(iOS 需要用户手动授权)</p>
            </div>
        )}

        {cameraError && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-red-400 p-6 text-center">
                <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="text-sm">{cameraError}</p>
            </div>
        )}
    </div>
  );
};

export default Scanner;