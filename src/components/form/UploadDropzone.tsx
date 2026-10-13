"use client";

import React, { useState, useRef } from "react";
import {
  CloudArrowUp,
  Image as ImageIcon,
  FilmStrip,
  Trash,
  CheckCircle,
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
  files?: UploadedFile[];
  onFilesChange?: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

export function UploadDropzone({
  label = "Unggah Bukti Foto / Video Kerusakan",
  helperText = "Maksimal 5 berkas (JPG, PNG, MP4 hingga 25MB per berkas)",
  accept = "image/*,video/*",
  maxFiles = 5,
  files = [],
  onFilesChange,
  disabled = false,
}: UploadDropzoneProps) {
  const [internalFiles, setInternalFiles] = useState<UploadedFile[]>(files);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFiles = onFilesChange ? files : internalFiles;

  const handleAddSampleFile = (type: "image" | "video") => {
    if (activeFiles.length >= maxFiles) return;

    const newId = `file-${Date.now()}`;
    const newFile: UploadedFile = {
      id: newId,
      name:
        type === "image"
          ? `bukti_kondisi_ac_${activeFiles.length + 1}.jpg`
          : `video_suara_bocor_${activeFiles.length + 1}.mp4`,
      size: type === "image" ? "2.4 MB" : "14.8 MB",
      type,
      url: "/brand/logo.png",
      progress: 100,
    };

    const nextList = [...activeFiles, newFile];
    if (onFilesChange) {
      onFilesChange(nextList);
    } else {
      setInternalFiles(nextList);
    }
  };

  const handleRemoveFile = (id: string) => {
    const nextList = activeFiles.filter((f) => f.id !== id);
    if (onFilesChange) {
      onFilesChange(nextList);
    } else {
      setInternalFiles(nextList);
    }
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
          if (!disabled) handleAddSampleFile("image");
        }}
        onClick={() => {
          if (!disabled && fileInputRef.current) {
            handleAddSampleFile("image");
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
            <span className="text-primary underline">klik untuk memilih</span>
          </p>
          <p className="text-[11px] text-neutral-slate">{helperText}</p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAddSampleFile("image");
            }}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-neutral-dark text-[10px] font-semibold hover:bg-slate-50 shadow-servio-xs flex items-center gap-1"
          >
            <ImageIcon size={12} className="text-primary" /> + Simulasi Foto
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAddSampleFile("video");
            }}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-neutral-dark text-[10px] font-semibold hover:bg-slate-50 shadow-servio-xs flex items-center gap-1"
          >
            <FilmStrip size={12} className="text-secondary" /> + Simulasi Video
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          className="sr-only"
        />
      </div>

      {/* Uploaded Files Preview List */}
      {activeFiles.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-slate">
            <span>Berkas Terunggah ({activeFiles.length}/{maxFiles})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeFiles.map((file) => {
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-servio-xs gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-sky text-primary shrink-0">
                      {file.type === "image" ? (
                        <ImageIcon size={18} weight="duotone" />
                      ) : (
                        <FilmStrip size={18} weight="duotone" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-neutral-dark truncate">
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
                    onClick={() => handleRemoveFile(file.id)}
                    className="p-1.5 rounded-lg text-neutral-slate hover:text-error hover:bg-rose-50 transition-colors"
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
