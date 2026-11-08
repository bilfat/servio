"use client";

import React, { useState, useRef } from "react";
import {
  CloudArrowUp,
  Image as ImageIcon,
  FilmStrip,
  Trash,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";

export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: "image" | "video";
  url: string;
  progress: number; // 0 - 100
}

export interface UploadDropzoneProps {
  label?: string;
  helperText?: string;
  accept?: string;
  maxFiles?: number;
  maxFileSizeMb?: number;
  files?: UploadedFile[];
  onFilesChange?: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

export function UploadDropzone({
  label = "Unggah Bukti Foto / Video Kerusakan",
  helperText = "Maksimal 5 berkas (JPG, PNG, WebP, MP4 hingga 10MB per berkas)",
  accept = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime",
  maxFiles = 5,
  maxFileSizeMb = 10,
  files = [],
  onFilesChange,
  disabled = false,
}: UploadDropzoneProps) {
  const [internalFiles, setInternalFiles] = useState<UploadedFile[]>(files);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFiles = onFilesChange ? files : internalFiles;

  const updateFiles = (nextList: UploadedFile[]) => {
    if (onFilesChange) {
      onFilesChange(nextList);
    } else {
      setInternalFiles(nextList);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleProcessFiles = (selectedFiles: FileList | File[]) => {
    setUploadError(null);
    const fileArray = Array.from(selectedFiles);
    if (fileArray.length === 0) return;

    const remainingSlots = maxFiles - activeFiles.length;
    if (remainingSlots <= 0) {
      setUploadError(`Batas maksimal ${maxFiles} berkas telah tercapai.`);
      return;
    }

    const filesToProcess = fileArray.slice(0, remainingSlots);
    const maxSizeBytes = maxFileSizeMb * 1024 * 1024;

    Promise.all(
      filesToProcess.map((file) => {
        return new Promise<UploadedFile | null>((resolve) => {
          if (file.size > maxSizeBytes) {
            setUploadError(`Berkas "${file.name}" (${formatFileSize(file.size)}) melebihi batas maksimal ${maxFileSizeMb}MB.`);
            resolve(null);
            return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const isVideo = file.type.startsWith("video/");
            resolve({
              id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              size: formatFileSize(file.size),
              type: isVideo ? "video" : "image",
              url: dataUrl || "",
              progress: 100,
            });
          };

          reader.onerror = () => {
            setUploadError(`Gagal membaca berkas "${file.name}". Silakan coba lagi.`);
            resolve(null);
          };

          reader.readAsDataURL(file);
        });
      })
    ).then((newFiles) => {
      const validFiles = newFiles.filter((f): f is UploadedFile => f !== null);
      if (validFiles.length > 0) {
        updateFiles([...activeFiles, ...validFiles]);
      }
    });
  };

  const handleRemoveFile = (id: string) => {
    setUploadError(null);
    const nextList = activeFiles.filter((f) => f.id !== id);
    updateFiles(nextList);
  };

  return (
    <div className="space-y-3 text-left font-body">
      {label && (
        <label className="block text-xs font-semibold text-neutral-dark font-display">
          {label}
        </label>
      )}

      {/* Drop Target Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (!disabled && e.dataTransfer.files) {
            handleProcessFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => {
          if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
          isDragOver
            ? "border-primary bg-sky/30 scale-[1.01]"
            : "border-slate-300 hover:border-primary/60 bg-slate-50/50 hover:bg-sky/10"
        } ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-sky text-primary flex items-center justify-center shadow-servio-xs">
          <CloudArrowUp size={28} weight="duotone" />
        </div>

        <div className="space-y-1 max-w-sm">
          <p className="text-xs font-bold text-neutral-dark font-display">
            Tarik & lepas berkas foto/video di sini, atau{" "}
            <span className="text-primary underline font-extrabold">klik untuk memilih dari perangkat</span>
          </p>
          <p className="text-[11px] text-neutral-slate">{helperText}</p>
        </div>

        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium">
          <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            <ImageIcon size={14} className="text-primary" /> Format: JPG, PNG, WebP
          </span>
          <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            <FilmStrip size={14} className="text-secondary" /> Video: MP4 (Maks. {maxFileSizeMb}MB)
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => {
            if (e.target.files) {
              handleProcessFiles(e.target.files);
              e.target.value = ""; // Reset to allow re-upload of same file name
            }
          }}
          className="sr-only"
        />
      </div>

      {/* File Size or Count Warning */}
      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <WarningCircle size={16} weight="fill" className="shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Uploaded Files Preview List */}
      {activeFiles.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-slate font-medium">
            <span>Berkas Terunggah ({activeFiles.length}/{maxFiles})</span>
            <span className="text-emerald-600 font-semibold">Tersimpan dalam permohonan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activeFiles.map((file) => {
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-servio-xs gap-3 transition-all hover:border-slate-300"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {file.type === "image" && file.url ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-sky text-primary flex items-center justify-center shrink-0">
                        {file.type === "image" ? (
                          <ImageIcon size={22} weight="duotone" />
                        ) : (
                          <FilmStrip size={22} weight="duotone" />
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-neutral-dark truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-neutral-slate font-mono">
                          {file.size}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold">
                          <CheckCircle size={12} weight="fill" /> Siap
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(file.id);
                    }}
                    className="p-2 rounded-lg text-neutral-slate hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                    title="Hapus berkas"
                    aria-label="Hapus berkas"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
