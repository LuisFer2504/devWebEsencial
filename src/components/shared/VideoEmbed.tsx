"use client";

import { useState } from "react";
import { Play } from "lucide-react";

interface VideoEmbedProps {
  /** URL segura de reproductor (getEmbedVideoUrl). */
  embedUrl: string;
  /** Miniatura estática (getVideoThumbnailUrl); null si la plataforma no ofrece una. */
  thumbnailUrl: string | null;
  title: string;
}

/**
 * Reproductor diferido: muestra una miniatura y solo carga el iframe (y sus cookies/scripts de terceros)
 * cuando la persona pulsa "reproducir". Mejora la velocidad de carga y la privacidad.
 */
export function VideoEmbed({ embedUrl, thumbnailUrl, title }: VideoEmbedProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    const src = `${embedUrl}${embedUrl.includes("?") ? "&" : "?"}autoplay=1`;
    return (
      <div className="aspect-video w-full bg-black">
        <iframe
          src={src}
          title={title}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block aspect-video w-full overflow-hidden bg-zinc-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
      aria-label={`Reproducir video: ${title}`}
    >
      {thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 text-amber-400 ring-1 ring-amber-400/50 transition-transform group-hover:scale-110">
          <Play className="h-8 w-8 translate-x-0.5" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
