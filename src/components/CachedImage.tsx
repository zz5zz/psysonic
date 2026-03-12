import React, { useEffect, useState } from 'react';
import { getCachedUrl } from '../utils/imageCache';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  cacheKey: string;
}

export function useCachedUrl(fetchUrl: string, cacheKey: string): string {
  const [resolved, setResolved] = useState('');
  useEffect(() => {
    if (!fetchUrl) { setResolved(''); return; }
    getCachedUrl(fetchUrl, cacheKey).then(setResolved);
  }, [fetchUrl, cacheKey]);
  return resolved || fetchUrl;
}

export default function CachedImage({ src, cacheKey, ...props }: CachedImageProps) {
  const resolvedSrc = useCachedUrl(src, cacheKey);
  return <img src={resolvedSrc} {...props} />;
}
