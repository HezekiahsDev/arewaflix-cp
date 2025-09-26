import { Video, formatRelativeDate, formatViewCount } from "@/lib/api/videos";

export function getDurationLabel(video: Video): string | undefined {
  if (typeof video.duration === "string" && video.duration.trim()) {
    return video.duration.trim();
  }

  if (
    typeof video.durationSeconds === "number" &&
    Number.isFinite(video.durationSeconds) &&
    video.durationSeconds > 0
  ) {
    return secondsToTimestamp(video.durationSeconds);
  }

  return undefined;
}

function secondsToTimestamp(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds / 60) % 60)
    .toString()
    .padStart(2, "0");
  const hours = Math.floor(totalSeconds / 3600);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

export function getAuthorLabel(video: Video): string | undefined {
  if (typeof video.author === "string" && video.author.trim()) {
    return video.author.trim();
  }

  return undefined;
}

export function buildVideoSubtitle(video: Video): string | undefined {
  const parts: string[] = [];

  if (typeof video.views === "number") {
    parts.push(formatViewCount(video.views));
  }

  const relative = formatRelativeDate(video.createdAt);
  if (relative) {
    parts.push(relative);
  }

  return parts.length ? parts.join(" • ") : undefined;
}

export function buildHeroMeta(video?: Video): string | undefined {
  if (!video) {
    return undefined;
  }

  const parts: string[] = [];
  const relative = formatRelativeDate(video.createdAt);
  if (relative) {
    parts.push(relative);
  }

  if (video.category && video.category.trim()) {
    parts.push(video.category.trim());
  }

  if (typeof video.views === "number") {
    parts.push(formatViewCount(video.views));
  }

  return parts.length ? parts.join(" • ") : undefined;
}
