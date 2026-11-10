export interface PreparedMediaDraft {
  id: string;
  file: File;
  previewUrl: string;
  mediaType: "IMAGE" | "VIDEO_KEYFRAME";
  frameTimestampSec: number | null;
  sourceName: string;
}

function makeDraftId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function prepareImageAttachment(file: File): Promise<PreparedMediaDraft> {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes((file.type || "").toLowerCase())) {
    throw new Error(`Format foto "${file.name}" tidak didukung. Gunakan JPG, PNG, atau WEBP.`);
  }

  // If compact enough, keep original; otherwise resize cleanly on canvas
  if (file.size <= 1_800_000) {
    return {
      id: makeDraftId(),
      file,
      previewUrl: URL.createObjectURL(file),
      mediaType: "IMAGE",
      frameTimestampSec: null,
      sourceName: file.name,
    };
  }

  const imgUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Gagal membaca gambar ${file.name}.`));
      el.src = imgUrl;
    });

    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context tidak tersedia.");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    if (!blob) throw new Error("Gagal mengompresi foto.");

    const compressedFile = new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
      type: "image/jpeg",
    });

    return {
      id: makeDraftId(),
      file: compressedFile,
      previewUrl: URL.createObjectURL(compressedFile),
      mediaType: "IMAGE",
      frameTimestampSec: null,
      sourceName: file.name,
    };
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}

export async function extractVideoKeyframes(
  file: File,
  options?: { maxFrames?: number; maxDimension?: number }
): Promise<{
  frames: PreparedMediaDraft[];
  durationSec: number;
}> {
  const maxFrames = Math.min(Math.max(options?.maxFrames ?? 4, 2), 6);
  const maxDim = options?.maxDimension ?? 960;

  if (file.size > 60 * 1024 * 1024) {
    throw new Error("Ukuran file video terlalu besar (maksimal 60 MB).");
  }

  const videoUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error("Timeout membaca metadata video. Coba video MP4/WebM berdurasi lebih singkat."));
      }, 10000);

      video.onloadeddata = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error(`Codec video "${file.name}" tidak didukung browser. Gunakan MP4 atau WebM.`));
      };
      video.src = videoUrl;
      video.load();
    });

    // Workaround untuk video WebM hasil perekaman browser (MediaRecorder) yang melaporkan duration = Infinity
    let rawDuration = Number(video.duration);
    if (rawDuration === Infinity || !Number.isFinite(rawDuration)) {
      await new Promise<void>((resolve) => {
        const fixTimer = window.setTimeout(() => resolve(), 2000);
        const onFixed = () => {
          if (Number.isFinite(video.duration) && video.duration > 0) {
            window.clearTimeout(fixTimer);
            video.removeEventListener("durationchange", onFixed);
            video.removeEventListener("timeupdate", onFixed);
            video.removeEventListener("seeked", onFixed);
            resolve();
          }
        };
        video.addEventListener("durationchange", onFixed);
        video.addEventListener("timeupdate", onFixed);
        video.addEventListener("seeked", onFixed);
        try {
          video.currentTime = 1e9;
        } catch {
          window.clearTimeout(fixTimer);
          resolve();
        }
      });
      rawDuration = Number(video.duration);
      // Seek back to start so first frame capture isn't stuck at end
      await new Promise<void>((resolve) => {
        const backTimer = window.setTimeout(() => resolve(), 1500);
        video.addEventListener(
          "seeked",
          () => {
            window.clearTimeout(backTimer);
            resolve();
          },
          { once: true }
        );
        try {
          video.currentTime = 0;
        } catch {
          window.clearTimeout(backTimer);
          resolve();
        }
      });
    }

    const validDuration =
      Number.isFinite(rawDuration) && rawDuration > 0.2 ? rawDuration : 0;

    let timestamps: number[] = [0];
    if (validDuration > 0.5) {
      const count = validDuration >= 4 ? maxFrames : Math.max(2, Math.min(3, maxFrames));
      const start = Math.min(0.15, validDuration * 0.08);
      const end = Math.max(start, validDuration * 0.92);
      timestamps = [];
      for (let i = 0; i < count; i++) {
        const ratio = count === 1 ? 0 : i / (count - 1);
        const t = Number((start + (end - start) * ratio).toFixed(2));
        timestamps.push(t);
      }
    }

    const vidW = video.videoWidth || 640;
    const vidH = video.videoHeight || 360;
    const scale = Math.min(1, maxDim / Math.max(vidW, vidH));
    const width = Math.max(160, Math.round(vidW * scale));
    const height = Math.max(120, Math.round(vidH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Gagal menginisialisasi kanvas ekstraksi frame.");

    const frames: PreparedMediaDraft[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const targetSec = timestamps[i];

      if (Math.abs(video.currentTime - targetSec) > 0.05) {
        await new Promise<void>((resolve) => {
          const seekTimer = window.setTimeout(() => resolve(), 2500);
          const onSeeked = () => {
            window.clearTimeout(seekTimer);
            video.removeEventListener("seeked", onSeeked);
            resolve();
          };
          video.addEventListener("seeked", onSeeked, { once: true });
          try {
            video.currentTime = targetSec;
          } catch {
            window.clearTimeout(seekTimer);
            resolve();
          }
        });
      }

      ctx.drawImage(video, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.82)
      );
      if (!blob) continue;

      const frameFile = new File(
        [blob],
        `keyframe-${i + 1}-${targetSec.toFixed(1)}s.jpg`,
        { type: "image/jpeg" }
      );

      frames.push({
        id: makeDraftId(),
        file: frameFile,
        previewUrl: URL.createObjectURL(frameFile),
        mediaType: "VIDEO_KEYFRAME",
        frameTimestampSec: targetSec,
        sourceName: `${file.name} (${targetSec.toFixed(1)}d)`,
      });
    }

    if (frames.length === 0) {
      throw new Error("Tidak ada frame yang berhasil diekstrak dari video tersebut.");
    }

    return { frames, durationSec: validDuration };
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(videoUrl);
  }
}

