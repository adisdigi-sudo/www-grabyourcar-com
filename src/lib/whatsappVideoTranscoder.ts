// WhatsApp-safe video transcoder (browser, ffmpeg.wasm)
// Why: WhatsApp/Meta player choke on videos with B-frames, edit-lists,
// negative CTS, late SEI, or non-zero start_time. We re-encode to:
//   - H.264 Constrained Baseline 3.1, yuv420p, no B-frames
//   - +faststart (moov atom at front for streaming)
//   - AAC LC 44.1 kHz stereo, audio aligned to 0
//   - PTS reset, edit-lists stripped
// Result: small, universally playable on Android + iOS WhatsApp.

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFfmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    if (onLog) ffmpeg.on("log", ({ message }) => onLog(message));

    // Load core from jsDelivr CDN (avoids bundling huge wasm)
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

export interface TranscodeOptions {
  onProgress?: (ratio: number) => void;
  onLog?: (msg: string) => void;
  /** If true, skip transcoding for files already < this many MB AND already h264+aac.
   *  We still always transcode to be safe — Meta is picky.
   */
  forceTranscode?: boolean;
}

/**
 * Returns a WhatsApp-safe MP4 File. Always re-encodes (cheap insurance —
 * skipping for "looks fine" files is what got us a broken upload last time).
 */
export async function transcodeForWhatsApp(file: File, opts: TranscodeOptions = {}): Promise<File> {
  const ffmpeg = await getFfmpeg(opts.onLog);

  if (opts.onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      opts.onProgress!(Math.max(0, Math.min(1, progress)));
    });
  }

  const inputName = "input." + (file.name.split(".").pop() || "mp4");
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Args: WhatsApp-safe profile.
  // - libx264 baseline 3.1, no B-frames, ref=1
  // - 720p cap (keep aspect), yuv420p
  // - reset PTS, strip edit lists, +faststart
  // - audio AAC stereo 44.1k 128k
  await ffmpeg.exec([
    "-y", "-i", inputName,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-c:v", "libx264",
    "-profile:v", "baseline",
    "-level", "3.1",
    "-preset", "veryfast",
    "-crf", "24",
    "-pix_fmt", "yuv420p",
    "-bf", "0",
    "-refs", "1",
    "-g", "48",
    "-keyint_min", "48",
    "-sc_threshold", "0",
    "-vf", "scale='min(1280,iw)':-2,setpts=PTS-STARTPTS",
    "-af", "aresample=async=1:first_pts=0,asetpts=PTS-STARTPTS",
    "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
    "-movflags", "+faststart",
    "-avoid_negative_ts", "make_zero",
    "-fflags", "+genpts",
    "-max_muxing_queue_size", "1024",
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName) as Uint8Array;

  // Best-effort cleanup
  try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
  try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "video";
  return new File([data], `${baseName}-wa.mp4`, { type: "video/mp4" });
}

/** Quick check — does the file look like a video at all? */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mp4|mov|3gp|3gpp|webm|mkv|avi)$/i.test(file.name);
}
