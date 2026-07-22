import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Ad } from '../lib/types';
import { Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';

export function AdBanner() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    supabase
      .from('ads')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => { if (data) setAds(data as Ad[]); });
  }, []);

  useEffect(() => {
    if (ads.length < 2) return;
    const timer = setInterval(() => setIndex(i => (i + 1) % ads.length), 6000);
    return () => clearInterval(timer);
  }, [ads.length]);

  if (ads.length === 0) return null;
  const ad = ads[index % ads.length];

  const content = (
    <div className="relative h-48 sm:h-64 w-full">
      {ad.image_url ? (
        <img src={ad.image_url} alt={ad.title} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center">
          <Megaphone className="w-14 h-14 text-white/40" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <h3 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">{ad.title}</h3>
        {ad.description && <p className="text-sm sm:text-base text-white/90 mt-1 drop-shadow max-w-2xl">{ad.description}</p>}
      </div>
    </div>
  );

  return (
    <div className="relative card overflow-hidden mb-6 animate-slide-up p-0">
      {ad.link_url ? (
        <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-95 transition-opacity">
          {content}
        </a>
      ) : content}

      {ads.length > 1 && (
        <>
          <button
            onClick={() => setIndex(i => (i - 1 + ads.length) % ads.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-[#10141f]/80 hover:bg-white dark:hover:bg-slate-900 flex items-center justify-center shadow-md transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          </button>
          <button
            onClick={() => setIndex(i => (i + 1) % ads.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-[#10141f]/80 hover:bg-white dark:hover:bg-slate-900 flex items-center justify-center shadow-md transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          </button>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {ads.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === index % ads.length ? 'bg-white' : 'bg-white/40'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
