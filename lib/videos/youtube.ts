const QUALITY_ORDER = [
  "2160p",
  "1440p",
  "1080p",
  "720p",
  "480p",
  "360p",
  "240p",
  "144p",
];

const YOUTUBE_STREAM_CACHE = new Map<string, string>();

type PipedStream = {
  url?: string;
  quality?: string;
  codec?: string;
  mimeType?: string;
  bitrate?: number;
};

type PipedStreamsResponse = {
  videoStreams?: PipedStream[];
  hls?: string;
};

function getQualityPriority(quality?: string): number {
  if (!quality) return QUALITY_ORDER.length;
  const index = QUALITY_ORDER.indexOf(quality);
  return index === -1 ? QUALITY_ORDER.length : index;
}

export async function fetchYoutubePlaybackUrl(
  videoId: string,
  signal?: AbortSignal
): Promise<string | null> {
  if (YOUTUBE_STREAM_CACHE.has(videoId)) {
    return YOUTUBE_STREAM_CACHE.get(videoId) ?? null;
  }

  try {
    const response = await fetch(
      `https://pipedapi.in.projectsegfau.lt/streams/${videoId}`,
      { signal }
    );

    if (!response.ok) {
      console.warn(
        `[YouTubeStreams] Failed to fetch stream for ${videoId}: ${response.status}`
      );
      return null;
    }

    const payload = (await response.json()) as PipedStreamsResponse;
    const streams = (payload.videoStreams ?? []).filter(
      (stream): stream is Required<PipedStream> =>
        typeof stream.url === "string" && stream.url.startsWith("http")
    );

    const prioritized = streams
      .filter((stream) => {
        const mime = stream.mimeType?.toLowerCase() ?? "";
        const codec = stream.codec?.toLowerCase() ?? "";
        return (
          mime.includes("mp4") ||
          mime.includes("h264") ||
          codec.includes("avc") ||
          codec.includes("h264")
        );
      })
      .sort(
        (a, b) => getQualityPriority(a.quality) - getQualityPriority(b.quality)
      );

    const bestMatch = prioritized[0] ?? streams[0];

    if (bestMatch?.url) {
      YOUTUBE_STREAM_CACHE.set(videoId, bestMatch.url);
      return bestMatch.url;
    }

    if (typeof payload.hls === "string" && payload.hls.startsWith("http")) {
      YOUTUBE_STREAM_CACHE.set(videoId, payload.hls);
      return payload.hls;
    }
  } catch (error) {
    if ((error as Error)?.name !== "AbortError") {
      console.warn("[YouTubeStreams] Unable to resolve playback URL", error);
    }
  }

  return null;
}

export function resetYoutubeStreamCache() {
  YOUTUBE_STREAM_CACHE.clear();
}
