/**
 * Convierte URLs estándar de YouTube o Vimeo a URLs seguras para iframe embed.
 * Retorna null si la URL no es válida o no corresponde a una plataforma soportada.
 */
export function getEmbedVideoUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();

  // YouTube Shorts, Watch y Cortos
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // Si ya es un enlace directo seguro de embed
  if (trimmed.startsWith("https://www.youtube-nocookie.com/embed/") || trimmed.startsWith("https://player.vimeo.com/video/")) {
    return trimmed;
  }

  return null;
}

/**
 * Miniatura estática (sin cookies) para mostrar antes de cargar el reproductor.
 * Solo YouTube tiene una URL de miniatura predecible; para otras plataformas devuelve null.
 */
export function getVideoThumbnailUrl(rawUrl?: string): string | null {
  const embed = getEmbedVideoUrl(rawUrl);
  const yt = embed?.match(/youtube-nocookie\.com\/embed\/([\w-]{11})/);
  return yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : null;
}
