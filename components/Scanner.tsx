import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ScannerProps {
  onScanSuccess: (decodedText: string, decodedResult: any) => void;
  onScanFailure?: (error: any) => void;
  isScanning: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, isScanning }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const regionId = "html5qr-code-full-region";
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    // Check camera support primarily
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setHasPermission(true);
    } else {
      setHasPermission(false);
    }

    return () => {
      if (scannerRef.current) {
        try {
            scannerRef.current.clear().catch((err: any) => console.error("Failed to clear scanner", err));
        } catch (e) {
            console.warn("Scanner clear error", e);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!isScanning || !hasPermission) {
        if (scannerRef.current) {
             try {
                scannerRef.current.clear();
             } catch(e) { /* ignore */ }
             scannerRef.current = null;
        }
        return;
    }

    const startScanner = () => {
        // Double check it's not already running
        if (scannerRef.current) return;

        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        try {
            const scanner = new Html5QrcodeScanner(regionId, config, /* verbose= */ false);
            scannerRef.current = scanner;
            
            scanner.render((decodedText: string, decodedResult: any) => {
                onScanSuccess(decodedText, decodedResult);
            }, (errorMessage: any) => {
                // ignore errors, too noisy
            });
        } catch (e) {
            console.error("Error starting scanner", e);
        }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 100);

    return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
            try {
                scannerRef.current.clear().catch((err: any) => console.warn(err));
            } catch (e) { /* ignore */ }
            scannerRef.current = null;
        }
    };
  }, [isScanning, onScanSuccess, hasPermission]);

  if (hasPermission === false) {
    return <div className="p-4 text-red-500 text-center">无法访问相机或权限被拒绝。</div>;
  }

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-lg bg-black relative">
      <div id={regionId} className="w-full text-white"></div>
      {!isScanning && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
            <p>扫描已暂停</p>
        </div>
      )}
    </div>
  );
};

export default Scanner;