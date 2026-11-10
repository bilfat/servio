"use client";

import React, { useRef, useState, useEffect } from "react";
import { Camera, ArrowsClockwise, Check, X, WarningCircle } from "@phosphor-icons/react";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob, previewUrl: string) => void;
}

export function CameraCaptureModal({ isOpen, onClose, onCapture }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedDataUrl(null);
      setCapturedBlob(null);
      setErrorMsg(null);
      return;
    }

    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode: "environment" | "user") => {
    stopCamera();
    setErrorMsg(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setErrorMsg("Kamera tidak dapat diakses. Pastikan izin kamera aktif di browser Anda.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedBlob(blob);
          setCapturedDataUrl(url);
          stopCamera();
        }
      },
      "image/jpeg",
      0.85
    );
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    setCapturedBlob(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (capturedBlob && capturedDataUrl) {
      onCapture(capturedBlob, capturedDataUrl);
      onClose();
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white">
            <Camera size={20} className="text-emerald-400" />
            <span className="font-semibold text-sm">Ambil Foto Langsung</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {errorMsg ? (
            <div className="p-6 text-center text-slate-300 flex flex-col items-center gap-3">
              <WarningCircle size={40} className="text-amber-400" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          ) : capturedDataUrl ? (
            <img
              src={capturedDataUrl}
              alt="Hasil Jepretan"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Switch Camera Button (Only if camera is live) */}
          {!capturedDataUrl && !errorMsg && (
            <button
              onClick={toggleCamera}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-sm transition"
              title="Balik Kamera"
            >
              <ArrowsClockwise size={20} />
            </button>
          )}
        </div>

        {/* Controls Footer */}
        <div className="p-4 bg-slate-950/90 flex items-center justify-between gap-4">
          {capturedDataUrl ? (
            <>
              <button
                onClick={handleRetake}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 font-medium text-sm flex items-center justify-center gap-2 transition"
              >
                <ArrowsClockwise size={18} />
                Foto Ulang
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition"
              >
                <Check size={18} weight="bold" />
                Gunakan Foto
              </button>
            </>
          ) : (
            <div className="w-full flex justify-center py-1">
              <button
                disabled={!!errorMsg}
                onClick={handleTakeSnapshot}
                className="h-14 w-14 rounded-full border-4 border-white bg-red-600 hover:bg-red-500 active:scale-95 transition shadow-lg flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                title="Ambil Foto"
              >
                <div className="h-10 w-10 rounded-full bg-white/20" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
