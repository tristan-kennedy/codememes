import { useEffect, useState } from "react";
import type { Recognition } from "../shared/protocol";

export function CardMedia({ content }: { content: Recognition }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = content.asset;
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);
  return (
    <span className={`card-media media-${content.kind}`}>
      <span className={`meme-phrase ${loaded && !failed && src ? "media-text-fallback" : ""}`}>
        {content.phrase || content.name}
      </span>
      {src && !failed && (
        <img
          key={src}
          src={src}
          width={content.width}
          height={content.height}
          alt={content.description}
          className={loaded ? "media-loaded" : "media-loading"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          decoding="async"
        />
      )}
    </span>
  );
}
