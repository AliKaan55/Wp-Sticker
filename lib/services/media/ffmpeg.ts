
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export interface FfmpegRun {
  readonly exitCode: number | null;
  readonly stderr: string;
  readonly timedOut: boolean;
}

const MAX_STDERR_CHARS = 64 * 1024;

const BUNDLED_BINARY = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";

const MAX_PARENT_LEVELS = 6;

let bundledPath: string | null | undefined;

function loadBundledPath(): string | null {
  if (bundledPath !== undefined) {
    return bundledPath;
  }

  let directory = process.cwd();
  for (let level = 0; level < MAX_PARENT_LEVELS; level += 1) {
    const candidate = join(directory, "node_modules", "ffmpeg-static", BUNDLED_BINARY);
    if (existsSync(candidate)) {
      bundledPath = candidate;
      return candidate;
    }
    const parent = dirname(directory);
    if (parent === directory) {
      break;
    }
    directory = parent;
  }

  bundledPath = null;
  return null;
}

export function getFfmpegPath(): string | null {
  const fromEnv = process.env.FFMPEG_PATH;
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }
  return loadBundledPath();
}

export function runFfmpeg(
  binary: string,
  args: readonly string[],
  timeoutMs: number,
): Promise<FfmpegRun> {
  return new Promise<FfmpegRun>((resolve, reject) => {
    const child = spawn(binary, [...args], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, Math.max(1, timeoutMs));

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < MAX_STDERR_CHARS) {
        stderr += chunk.toString("utf8");
      }
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stderr, timedOut });
    });
  });
}

export interface ProbeResult {
  readonly hasVideo: boolean;
  readonly durationSeconds: number | null;
  // Best-effort coded (pre-rotation) dimensions, used only to clamp a
  // requested crop rect to something ffmpeg will accept. May be null if
  // ffmpeg's output couldn't be parsed.
  readonly width: number | null;
  readonly height: number | null;
}

export function parseProbeOutput(stderr: string): ProbeResult {
  const videoLineMatch = /Stream #\d+:\d+.*Video:[^\n]*/.exec(stderr);
  const hasVideo = videoLineMatch !== null;

  const dimensionMatch = videoLineMatch ? /(\d{2,5})x(\d{2,5})/.exec(videoLineMatch[0]) : null;
  const width = dimensionMatch ? Number(dimensionMatch[1]) : null;
  const height = dimensionMatch ? Number(dimensionMatch[2]) : null;

  const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  const hours = match?.[1];
  const minutes = match?.[2];
  const seconds = match?.[3];
  const durationSeconds =
    hours !== undefined && minutes !== undefined && seconds !== undefined
      ? Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
      : null;
  return { hasVideo, durationSeconds, width, height };
}

export async function probeMedia(binary: string, inputPath: string, timeoutMs: number): Promise<ProbeResult> {
  const run = await runFfmpeg(binary, ["-hide_banner", "-i", inputPath], timeoutMs);
  return parseProbeOutput(run.stderr);
}


