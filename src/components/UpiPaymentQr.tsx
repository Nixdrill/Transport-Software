import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Smartphone } from 'lucide-react';

interface UpiPaymentQrProps {
  upiId: string;
  payeeName: string;
  amount: number;
  invoiceNumber: string;
  size?: number;
  className?: string;
}

export const UpiPaymentQr: React.FC<UpiPaymentQrProps> = ({
  upiId,
  payeeName,
  amount,
  invoiceNumber,
  size = 110,
  className = '',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  // Construct standard NPCI / UPI payment URI
  // upi://pay?pa=VPA&pn=NAME&am=AMOUNT&tn=NOTE&cu=INR
  const cleanUpiId = upiId?.trim();
  const cleanName = encodeURIComponent(payeeName?.trim() || 'Logistics Billing');
  const cleanNote = encodeURIComponent(`Bill ${invoiceNumber}`);
  const cleanAmount = amount > 0 ? amount.toFixed(2) : '0';

  const upiUri = `upi://pay?pa=${cleanUpiId}&pn=${cleanName}&am=${cleanAmount}&tn=${cleanNote}&cu=INR`;

  useEffect(() => {
    if (!cleanUpiId) {
      setQrDataUrl('');
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(upiUri, {
      width: size * 2,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setError(false);
        }
      })
      .catch((err) => {
        console.warn('QR Code generation error:', err);
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [upiUri, size, cleanUpiId]);

  if (!cleanUpiId || error) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-slate-300 shadow-2xs text-center ${className}`}>
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt={`UPI QR Code for ${invoiceNumber}`}
          style={{ width: size, height: size }}
          className="rounded-lg block mx-auto"
        />
      ) : (
        <div style={{ width: size, height: size }} className="flex items-center justify-center bg-slate-100 rounded-lg">
          <QrCode className="h-8 w-8 text-slate-400 animate-pulse" />
        </div>
      )}
      <div className="mt-1 flex items-center space-x-1 text-[9px] font-black text-slate-900 tracking-tight">
        <Smartphone className="h-3 w-3 text-emerald-600" />
        <span>Scan & Pay via UPI</span>
      </div>
      <div className="text-[8px] font-mono font-bold text-slate-500 truncate max-w-[120px]">
        {cleanUpiId}
      </div>
    </div>
  );
};
