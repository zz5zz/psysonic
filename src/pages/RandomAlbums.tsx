import React, { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { getAlbumList, SubsonicAlbum } from '../api/subsonic';
import AlbumCard from '../components/AlbumCard';
import { useTranslation } from 'react-i18next';

const INTERVAL_MS = 30000;
const ALBUM_COUNT = 30;

export default function RandomAlbums() {
  const { t } = useTranslation();
  const [albums, setAlbums] = useState<SubsonicAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [renderKey, setRenderKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAlbumList('random', ALBUM_COUNT);
      setAlbums(data);
      setRenderKey(k => k + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const startCycle = useCallback(() => {
    // Clear existing timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    // Reset progress bar
    setProgress(0);
    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / INTERVAL_MS) * 100, 100));
    }, 100);

    // Auto-refresh
    timerRef.current = setInterval(() => {
      load().then(() => startCycle());
    }, INTERVAL_MS);
  }, [load]);

  useEffect(() => {
    load().then(() => startCycle());
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [load, startCycle]);

  const handleManualRefresh = () => {
    load().then(() => startCycle());
  };

  return (
    <div className="content-body animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>{t('randomAlbums.title')}</h1>
        <button
          className="btn btn-ghost"
          onClick={handleManualRefresh}
          disabled={loading}
          data-tooltip={t('randomAlbums.refresh')}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t('randomAlbums.refresh')}
        </button>
      </div>

      {/* Countdown progress bar */}
      <div className="random-albums-progress">
        <div className="random-albums-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {loading && albums.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="album-grid-wrap animate-fade-in" key={renderKey}>
          {albums.map(a => <AlbumCard key={a.id} album={a} />)}
        </div>
      )}
    </div>
  );
}
