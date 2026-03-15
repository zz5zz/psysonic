import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import AlbumRow from '../components/AlbumRow';
import { getAlbumList, SubsonicAlbum } from '../api/subsonic';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const [starred, setStarred] = useState<SubsonicAlbum[]>([]);
  const [recent, setRecent] = useState<SubsonicAlbum[]>([]);
  const [random, setRandom] = useState<SubsonicAlbum[]>([]);
  const [heroAlbums, setHeroAlbums] = useState<SubsonicAlbum[]>([]);
  const [mostPlayed, setMostPlayed] = useState<SubsonicAlbum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAlbumList('starred', 12).catch(() => []),
      getAlbumList('newest', 12).catch(() => []),
      getAlbumList('random', 20).catch(() => []),   // fetch 20 — split between Hero and Discover
      getAlbumList('frequent', 12).catch(() => []),
    ]).then(([s, n, r, f]) => {
      setStarred(s);
      setRecent(n);
      setHeroAlbums(r.slice(0, 8));
      setRandom(r.slice(8));
      setMostPlayed(f);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadMore = async (
    type: 'starred' | 'newest' | 'random' | 'frequent',
    currentList: SubsonicAlbum[],
    setter: React.Dispatch<React.SetStateAction<SubsonicAlbum[]>>
  ) => {
    try {
      const more = await getAlbumList(type, 12, currentList.length);
      // Ensure we don't append duplicates if the API returns them
      const newItems = more.filter(m => !currentList.find(c => c.id === m.id));
      if (newItems.length > 0) {
        setter(prev => [...prev, ...newItems]);
      }
    } catch (e) {
      console.error('Failed to load more', e);
    }
  };

  const { t } = useTranslation();

  return (
    <div className="animate-fade-in">
      <Hero albums={heroAlbums} />

      <div className="content-body" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {starred.length > 0 && (
              <AlbumRow 
                title={t('home.starred')} 
                albums={starred} 
                onLoadMore={() => loadMore('starred', starred, setStarred)}
                moreText={t('home.loadMore')} 
              />
            )}
            <AlbumRow 
              title={t('home.recent')} 
              albums={recent} 
              onLoadMore={() => loadMore('newest', recent, setRecent)}
              moreText={t('home.loadMore')} 
            />
            <AlbumRow 
              title={t('home.mostPlayed')} 
              albums={mostPlayed} 
              onLoadMore={() => loadMore('frequent', mostPlayed, setMostPlayed)}
              moreText={t('home.loadMore')} 
            />
            <AlbumRow 
              title={t('home.discover')} 
              albums={random} 
              onLoadMore={() => loadMore('random', random, setRandom)}
              moreText={t('home.discoverMore')} 
            />
          </>
        )}
      </div>
    </div>
  );
}
