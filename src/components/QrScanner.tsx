import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QrScanner({ onScan, onError }: { onScan: (text: string) => void, onError: (err: any) => void }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (error) => {
        onError(error);
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScan, onError]);

  return <div id="reader" className="w-full"></div>;
}
