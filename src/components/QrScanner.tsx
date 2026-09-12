import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QrScanner({ onScan, onError }: { onScan: (text: string) => void, onError: (err: any) => void }) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          if (scannerRef.current) {
             scannerRef.current.clear();
             scannerRef.current = null;
          }
          onScan(decodedText);
        },
        (error) => {
          onError(error);
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, []); // Empty dependency array prevents re-renders from breaking the scanner

  return <div id="qr-reader" className="w-full"></div>;
}
