import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  RotateCcw,
  Upload,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Smartphone,
  QrCode,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import jsQR from 'jsqr';

interface QrCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (scannedData: string) => void;
  addToast?: (toast: { type: 'success' | 'error' | 'info' | 'cloud'; title: string; description: string }) => void;
}

export const QrCodeScannerModal: React.FC<QrCodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  addToast,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [supportsTorch, setSupportsTorch] = useState(false);

  // Play an audio chime upon successful QR code detection
  const playSuccessChime = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);

      if (navigator.vibrate) {
        navigator.vibrate(80);
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, []);

  // Stop camera tracks and scanning loop
  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
  }, []);

  // Frame processing loop with jsQR
  const startScanningLoop = useCallback(() => {
    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data && code.data.trim()) {
            const rawData = code.data.trim();
            setScannedResult(rawData);
            playSuccessChime();
            stopCamera();

            if (addToast) {
              addToast({
                type: 'success',
                title: 'QR Code Scanned!',
                description: rawData.startsWith('upi://') ? 'UPI Payment Code detected.' : 'QR Code decoded successfully.',
              });
            }

            if (onScanSuccess) {
              onScanSuccess(rawData);
            }
            return;
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, [addToast, onScanSuccess, playSuccessChime, stopCamera]);

  // Request camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setIsInitializing(true);
    setCameraError(null);
    setScannedResult(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your current browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? (videoTrack.getCapabilities() as { torch?: boolean }) : {};
        setSupportsTorch(Boolean(capabilities?.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setIsInitializing(false);
      startScanningLoop();
    } catch (err: unknown) {
      setIsInitializing(false);
      const errorObj = err as Error;
      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser address bar to scan payment QR codes.');
      } else if (errorObj.name === 'NotFoundError' || errorObj.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can upload an image of the QR code instead.');
      } else {
        setCameraError(errorObj.message || 'Unable to access camera. You can upload an image file instead.');
      }
    }
  }, [cameraFacing, startScanningLoop, stopCamera]);

  // Handle image upload fallback
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          const rawData = code.data.trim();
          setScannedResult(rawData);
          playSuccessChime();
          stopCamera();

          if (addToast) {
            addToast({
              type: 'success',
              title: 'QR Code Decoded',
              description: 'Successfully read QR code from uploaded image.',
            });
          }

          if (onScanSuccess) {
            onScanSuccess(rawData);
          }
        } else {
          if (addToast) {
            addToast({
              type: 'error',
              title: 'No QR Code Found',
              description: 'Could not find a valid QR code in the uploaded image. Please try another image.',
            });
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Toggle torch / flashlight
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextTorch = !isTorchOn;
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch {
      // ignore
    }
  };

  // Toggle front/back camera
  const handleFlipCamera = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannedResult(null);
      setCameraError(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Parse UPI components if available
  const parseUpiDetails = (uri: string) => {
    if (!uri.startsWith('upi://')) return null;
    try {
      const url = new URL(uri.replace('upi://pay', 'http://upi.local/pay'));
      return {
        vpa: url.searchParams.get('pa') || '',
        name: url.searchParams.get('pn') || '',
        amount: url.searchParams.get('am') || '',
        orderId: url.searchParams.get('tr') || url.searchParams.get('tid') || '',
        note: url.searchParams.get('tn') || '',
      };
    } catch {
      return null;
    }
  };

  const upiInfo = scannedResult ? parseUpiDetails(scannedResult) : null;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="qr-scanner-modal-backdrop"
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-slate-900 font-sans"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-[#F9FAFB]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Scan QR Code</h3>
                <p className="text-[11px] text-slate-500">Align the payment QR code within the frame</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Viewfinder or Scanned State */}
            {!scannedResult ? (
              <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Laser Scanning Animation Reticle */}
                {!cameraError && !isInitializing && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                    <div className="relative w-56 h-56 border-2 border-dashed border-indigo-400/70 rounded-2xl flex items-center justify-center">
                      {/* Corner Target Markers */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-indigo-500 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-indigo-500 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-indigo-500 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-indigo-500 rounded-br-lg" />

                      {/* Scanning Laser Line */}
                      <motion.div
                        animate={{ y: [-90, 90, -90] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                        className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee]"
                      />
                    </div>
                  </div>
                )}

                {/* Initializing Spinner */}
                {isInitializing && !cameraError && (
                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                    <p className="text-xs font-medium text-slate-300">Opening Camera...</p>
                  </div>
                )}

                {/* Error Banner in Viewfinder */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center space-y-3 text-white">
                    <AlertCircle className="w-10 h-10 text-rose-400" />
                    <p className="text-xs font-medium text-slate-200 leading-relaxed">
                      {cameraError}
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Floating Controls on Camera View */}
                {!cameraError && !isInitializing && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleFlipCamera}
                      className="p-2 rounded-xl bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md text-xs font-medium flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Flip Camera</span>
                    </button>

                    {supportsTorch && (
                      <button
                        type="button"
                        onClick={handleToggleTorch}
                        className={`p-2 rounded-xl backdrop-blur-md text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isTorchOn
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                            : 'bg-slate-900/70 hover:bg-slate-900 text-white border-white/10'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{isTorchOn ? 'Torch On' : 'Torch'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Scanned Success Display Card */
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3.5">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    QR Code Scanned Successfully
                  </h4>
                </div>

                {/* UPI Details or Raw String */}
                {upiInfo ? (
                  <div className="p-3 bg-white rounded-xl border border-emerald-200/80 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payee UPI ID:</span>
                      <strong className="font-mono text-indigo-700">{upiInfo.vpa || 'N/A'}</strong>
                    </div>
                    {upiInfo.name && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Payee Name:</span>
                        <strong className="text-slate-800">{upiInfo.name}</strong>
                      </div>
                    )}
                    {upiInfo.amount && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount:</span>
                        <strong className="text-slate-900 font-extrabold text-sm">₹{upiInfo.amount}</strong>
                      </div>
                    )}
                    {upiInfo.orderId && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Order Ref:</span>
                        <strong className="font-mono text-slate-700">{upiInfo.orderId}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-emerald-200/80 text-xs font-mono break-all text-slate-800 max-h-24 overflow-y-auto">
                    {scannedResult}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  {scannedResult.startsWith('upi://') && (
                    <a
                      href={scannedResult}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all text-center"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Open in UPI App</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(scannedResult);
                      setCopiedResult(true);
                      setTimeout(() => setCopiedResult(false), 2000);
                      if (addToast) {
                        addToast({
                          type: 'success',
                          title: 'Copied!',
                          description: 'Scanned payload copied to clipboard.',
                        });
                      }
                    }}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    {copiedResult ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedResult ? 'Copied!' : 'Copy Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Scan Another</span>
                  </button>
                </div>
              </div>
            )}

            {/* Alternative: Upload Image Fallback */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Have a QR code screenshot or photo?</span>
              <label className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors">
                <Upload className="w-3 h-3 text-indigo-600" />
                <span>Upload QR Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
