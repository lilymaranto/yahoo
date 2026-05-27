import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Home, Globe, Bell, User, MessageCircle, Bookmark, Share2, Play, MoreHorizontal, Settings, Smile, Shield, X, BellRing } from 'lucide-react';
import { startWebSession, setUser as syncUserToNative, listenForNative } from '../solcon-starter/demo_bridge_entry';
import { brazeChangeUser, brazeLogEvent, subscribeToContentCards, logContentCardImpressions, logContentCardClick, dismissContentCard } from './braze';
import personaMap from '../solcon-starter/persona-map.json';

const CONFIG_ID = 'yahoo1';
const getInitialUserId = () => {
  try {
    return sessionStorage.getItem('yahoo_saved_user') || 'anon123';
  } catch {
    return 'anon123';
  }
};
const DEFAULT_USER_ID = getInitialUserId();


// Waveform bar heights (fixed so they don't re-render randomly)
const WAVEFORM = [30, 55, 70, 45, 85, 60, 40, 90, 55, 35, 75, 50, 65, 80, 45, 60, 35, 70, 55, 40, 80, 50, 65, 30, 30, 55, 70, 45, 85, 60, 40, 90, 55, 35, 75, 50, 65, 80, 45, 60, 35, 70, 55, 40, 80, 50, 65, 30];

// Header: logo+search visible initially, slides away on scroll; tabs always pinned
const Header = ({ scrolled }: { scrolled: boolean }) => (
  <header className="sticky top-0 z-40 bg-[#101719] pt-12 pb-0">
    <div
      style={{
        maxHeight: scrolled ? 0 : 72,
        opacity: scrolled ? 0 : 1,
        overflow: 'hidden',
        transition: 'max-height 0.22s ease, opacity 0.18s ease, margin-bottom 0.22s ease',
        marginBottom: scrolled ? 0 : 10,
      }}
      className="flex justify-between items-center px-4"
    >
      <div className="w-8" />
      <img src="/yahoo.png" alt="Yahoo News" className="h-14" />
      <button type="button" className="p-1.5 -mr-1.5">
        <Search className="w-[22px] h-[22px] text-white" strokeWidth={2.5} />
      </button>
    </div>
    <div className="category-tabs hide-scrollbar">
      <button type="button" className="category-tab category-tab--active">For You</button>
      <button type="button" className="category-tab">U.S. politics</button>
      <button type="button" className="category-tab">Celebs</button>
      <button type="button" className="category-tab">Recipes</button>
      <button type="button" className="category-tab">Tech</button>
    </div>
  </header>
);

// Sign-in promo card — compact height to match keep-reading card
const PromoContentCard = ({ card, isStatic = false, onDismiss }: { card: any; isStatic?: boolean; onDismiss?: () => void }) => {
  const title = isStatic ? 'Sign in to do more' : (card.title || card.extras?.title || '');
  const description = isStatic ? 'Leave comments, save history and more.' : (card.description || card.cardDescription || '');
  const url = isStatic ? '' : (card.url || card.link || card.extras?.url);
  const linkText = isStatic ? 'Sign in' : (card.linkText || card.extras?.linkText || card.extras?.link_text || card.extras?.LinkText || (url ? 'Learn More' : 'Sign in'));
  const image = isStatic ? null : (card.imageUrl || card.image || card.extras?.image);

  const handleClick = (e: React.MouseEvent) => {
    if (isStatic) return;
    logContentCardClick(card);
    if (url && url !== '#') {
      window.open(url, url.startsWith('http') ? '_blank' : '_self');
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isStatic) {
      onDismiss?.();
    } else {
      dismissContentCard(card);
    }
  };

  return (
    <div className="feed-card promo-card-body relative cursor-pointer" onClick={handleClick}>
      <button type="button" onClick={handleDismiss} className="absolute top-2.5 right-2.5 text-[#8E8E93] z-20">
        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
      <div className="flex items-center gap-3 relative z-10">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[13px] text-white mb-0.5 pr-4 leading-tight">{title}</p>
          <p className="text-[11px] text-[#8E8E93] mb-3 leading-snug">{description}</p>
          {(url || isStatic) && (
            <span className="inline-block bg-[#2C2C2E] text-white font-semibold text-[12px] px-3.5 py-1.5 rounded-full leading-none">
              {linkText}
            </span>
          )}
        </div>
        {(image || isStatic) && (
          image ? (
            <div className="relative flex items-center justify-center w-[52px] h-[52px] shrink-0 rounded-full overflow-hidden">
               <img src={image} className="w-full h-full object-cover" alt={title} />
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-[52px] h-[52px] shrink-0">
              <div className="absolute w-[52px] h-[52px] rounded-full border border-[#4a7fc1]/20" />
              <div className="absolute w-[39px] h-[39px] rounded-full border border-[#4a7fc1]/40" />
              <div className="absolute w-[27px] h-[27px] rounded-full border border-[#4a7fc1]/65 bg-[#1e2d42]/30" />
              <User className="w-3.5 h-3.5 text-[#4a7fc1] relative z-10" strokeWidth={1.8} />
            </div>
          )
        )}
      </div>
    </div>
  );
};

// Source logo components
const VarietyLogo = () => (
  <div className="w-[26px] h-[26px] rounded-full bg-black border border-[#555] flex items-center justify-center shrink-0">
    <span className="text-white font-black italic text-[13px] leading-none" style={{ fontFamily: 'Georgia, serif' }}>V</span>
  </div>
);

const YahooFinanceLogo = () => (
  <div className="w-[26px] h-[26px] rounded-full bg-[#7d2eff] flex items-center justify-center shrink-0">
    <span className="text-white font-black text-[11px] leading-none">Y!</span>
  </div>
);

// Large hero article card (horizontal carousel)
const HeroArticleCard = ({
  imageSrc,
  imageAlt,
  source,
  time,
  headline,
  comments,
  views,
}: {
  imageSrc: string;
  imageAlt: string;
  source: React.ReactNode;
  time: string;
  headline: string;
  comments: string;
  views?: string;
}) => (
  <article className="feed-card">
    <div className="feed-card-hero">
      <img src={imageSrc} alt={imageAlt} />
    </div>
    <div className="feed-card-body">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {source}
          <span className="text-[#8E8E93] text-[13px]">{time}</span>
        </div>
        <button type="button"><MoreHorizontal className="w-5 h-5 text-[#8E8E93]" /></button>
      </div>
      <h2 className="font-bold text-[19px] leading-[1.3] mb-4 text-white">{headline}</h2>
      <div className="flex items-center justify-between text-[#8E8E93]">
        <div className="flex items-center gap-5">
          <button type="button" className="flex items-center gap-1.5">
            <MessageCircle className="w-5 h-5" strokeWidth={1.8} />
            <span className="text-[13px] font-medium">{comments}</span>
          </button>
          <button type="button"><Bookmark className="w-5 h-5" strokeWidth={1.8} /></button>
          <button type="button"><Share2 className="w-5 h-5" strokeWidth={1.8} /></button>
        </div>
        {views && (
          <div className="flex items-center gap-1.5">
            <div className="w-[18px] h-[18px] border-[1.5px] border-[#8E8E93] rounded-full flex items-center justify-center">
              <div className="w-[6px] h-[6px] rounded-full bg-[#8E8E93]" />
            </div>
            <span className="text-[13px] font-medium">{views}</span>
          </div>
        )}
      </div>
    </div>
  </article>
);

// Article action icons row
const ArticleActions = ({ showCount }: { showCount?: string }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-5 text-[#8E8E93]">
      <button className="flex items-center gap-1.5">
        <MessageCircle className="w-5 h-5" strokeWidth={1.8} />
      </button>
      <button>
        <Bookmark className="w-5 h-5" strokeWidth={1.8} />
      </button>
      <button>
        <Share2 className="w-5 h-5" strokeWidth={1.8} />
      </button>
    </div>
    {showCount && (
      <div className="flex items-center gap-1.5 text-[#8E8E93]">
        <div className="w-[18px] h-[18px] border-[1.5px] border-[#8E8E93] rounded-full flex items-center justify-center">
          <div className="w-[6px] h-[6px] rounded-full bg-[#8E8E93]" />
        </div>
        <span className="text-[13px] font-medium">{showCount}</span>
      </div>
    )}
  </div>
);

const Feed = () => {
  const [signInDismissed, setSignInDismissed] = React.useState(false);
  const [homeCards, setHomeCards] = useState<any[]>([]);
  const promoCarouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Slight delay to ensure Braze is initialized
    const timer = setTimeout(() => {
      subscribeToContentCards('home', (cards) => {
        setHomeCards(cards);
        logContentCardImpressions(cards);
        
        // Ensure the newly inserted cards are immediately visible (snaps scroll to the left)
        if (cards.length > 0 && promoCarouselRef.current) {
          promoCarouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
  <main className="feed-stack bg-[#101719]">

    {/* Morning Briefing card */}
    <div className="feed-card feed-card--padded">
      <div className="flex items-center gap-1.5 mb-2.5 text-[#7d2eff] font-semibold text-[13px]">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0l1.6 5.1H15l-4.3 3.1 1.6 5.1L8 10.2l-4.3 3.1 1.6-5.1L1 5.1h5.4z"/>
        </svg>
        <span>Your Daily Digest</span>
      </div>
      {/* Headline + thumbnail row */}
      <div className="flex gap-3 items-start mb-4">
        <h2 className="flex-1 min-w-0 font-bold text-[15px] leading-[1.3] text-white">
          Top updates from Stocks &amp; investing, U.S. politics, and International politics. Hear the moments that matter.
        </h2>
        <div className="thumb-image" style={{ width: 62, height: 62 }}>
          <img
            src="/exclamation.png"
            className="w-full h-full object-cover"
            alt="Daily Digest"
          />
        </div>
      </div>
      {/* Audio row — full width so 02:44 aligns with right edge of image */}
      <div className="flex items-center gap-2.5">
        <button type="button" className="w-[38px] h-[38px] bg-[#7d2eff] rounded-full flex items-center justify-center pl-[2px] shrink-0">
          <Play className="w-4 h-4 text-white" fill="currentColor" />
        </button>
        <div className="flex-1 flex gap-[2px] items-center h-8">
          {WAVEFORM.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-[#8E8E93] rounded-full opacity-60"
              style={{ height: `${h}%`, maxWidth: 3 }}
            />
          ))}
        </div>
        <span className="text-[13px] text-[#8E8E93] shrink-0">02:44</span>
      </div>
    </div>

    {/* Hero articles — horizontal scroll */}
    <div className="featured-carousel hide-scrollbar">
      <HeroArticleCard
        imageSrc="/kevin-warsh.png"
        imageAlt="Kevin Warsh"
        source={
          <>
            <YahooFinanceLogo />
            <span className="font-semibold text-[13px] text-white">Yahoo Finance</span>
          </>
        }
        time="42m"
        headline="Kevin Warsh sworn in as Fed chair as inflation worries raise the volume on possible rate hikes"
        comments="1.9K"
        views="12K"
      />
      <HeroArticleCard
        imageSrc="/bill.png"
        imageAlt="Budget reconciliation bill"
        source={
          <>
            <div className="w-[26px] h-[26px] rounded-full bg-[#1a3a5c] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[9px] leading-none tracking-tight">THE<br/>HILL</span>
            </div>
            <span className="font-semibold text-[13px] text-white">The Hill</span>
          </>
        }
        time="8h"
        headline="GOP furor over Trump's 'anti-weaponization' fund sinks Senate budget reconciliation bill"
        comments="3.5K"
      />
    </div>

    {/* Keep reading + Sign in — compact horizontally scrollable promo row */}
    <div className="promo-carousel hide-scrollbar" ref={promoCarouselRef}>
      {homeCards.map(card => (
        <div key={card.id} className="promo-card">
          <PromoContentCard card={card} />
        </div>
      ))}
      {/* Keep reading — progress bar anchored to bottom */}
      <div className="feed-card promo-card-body promo-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <p className="font-semibold text-[13px] text-white mb-auto">Keep reading to level up.</p>
        <div className="mt-3">
          <div className="w-full bg-[#3A3A3C] rounded-full h-[3px] mb-1.5">
            <div className="bg-[#8E8E93] h-[3px] rounded-full" style={{ width: '3%' }} />
          </div>
          <p className="text-[11px] text-[#8E8E93]">10 more reads to reach Seeker level.</p>
        </div>
      </div>
      {!signInDismissed && (
        <div className="promo-card">
          <PromoContentCard card={{}} isStatic={true} onDismiss={() => setSignInDismissed(true)} />
        </div>
      )}
    </div>

    {/* Small Article — Penelope Cruz */}
    <div className="feed-card feed-card--padded">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <VarietyLogo />
          <span className="font-semibold text-[13px] text-white">Variety</span>
          <span className="text-[#8E8E93] text-[13px]">7h</span>
        </div>
        <button><MoreHorizontal className="w-5 h-5 text-[#8E8E93]" /></button>
      </div>
      <div className="flex gap-3 items-start">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-[17px] leading-[1.3] mb-4 text-white">
            Penelope Cruz Reveals She Was Warned of Brain Aneurysm Mid-Shoot on Cannes Favorite 'The Black Ball': 'I Thought I Was About to Die'
          </h2>
          <ArticleActions />
        </div>
        <div className="thumb-image">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop"
            className="w-full h-full object-cover"
            alt="Penelope Cruz"
          />
        </div>
      </div>
    </div>

    {/* Small Article — Tarantino */}
    <div className="feed-card feed-card--padded">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <VarietyLogo />
          <span className="font-semibold text-[13px] text-white">Variety</span>
          <span className="text-[#8E8E93] text-[13px]">13h</span>
        </div>
        <button><MoreHorizontal className="w-5 h-5 text-[#8E8E93]" /></button>
      </div>
      <div className="flex gap-3 items-start">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-[17px] leading-[1.3] mb-4 text-white">
            Quentin Tarantino Butted Heads With Brad Pitt While Filming 'Once Upon a Time... in Hollywood': 'You'll Be Dead in This Business'
          </h2>
          <ArticleActions />
        </div>
        <div className="thumb-image">
          <img
            src="/tarantino.png"
            className="w-full h-full object-cover"
            alt="Tarantino"
          />
        </div>
      </div>
    </div>

    {/* Extra padding so last card clears the nav */}
    <div className="h-2" />
  </main>
  );
};

// Top Stories tab — image cards matching home screen pill style
const STORY_IMAGES = [
  '/stories/two.png',
  '/stories/three.png',
  '/stories/four.png',
  '/stories/five.png',
  '/stories/six.png',
  '/stories/seven.png',
];

const TopStoriesTab = () => (
  <div className="feed-stack bg-[#101719]">
    {/* Page header */}
    <div className="flex items-center justify-center pt-14 pb-2" style={{ marginBottom: '-0.25rem' }}>
      <span className="text-[17px] font-semibold text-white">Top stories</span>
    </div>
    {/* Hero image — taller */}
    <div className="feed-card overflow-hidden" style={{ borderRadius: 20 }}>
      <img
        src="/stories/one.png"
        alt="Top story"
        className="w-full object-cover object-top"
        style={{ display: 'block' }}
      />
    </div>

    {/* Equal-height story cards */}
    {STORY_IMAGES.map((src, i) => (
      <div key={i} className="feed-card overflow-hidden" style={{ borderRadius: 20 }}>
        <img
          src={src}
          alt={`Story ${i + 2}`}
          className="w-full object-cover object-top"
          style={{ display: 'block' }}
        />
      </div>
    ))}

    <div className="h-2" />
  </div>
);

const NotificationCard = ({ title, image, time = '13h', onClick }: any) => (
  <div className="bg-[#1C1C1E] rounded-2xl px-4 py-3.5 cursor-pointer" onClick={onClick}>
    <div className="flex items-start gap-3">
      <p className="flex-1 text-[15px] text-white leading-[1.35] font-medium">
        {title}
      </p>
      {image && (
        <div className="w-[56px] h-[56px] rounded-xl overflow-hidden shrink-0 bg-black">
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
    <div className="flex items-center justify-between mt-2.5">
      <span className="text-[13px] text-[#636366]">{time}</span>
      <button type="button" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="w-5 h-5 text-[#636366]" strokeWidth={1.8} /></button>
    </div>
  </div>
);

const NotificationsTab = ({ userId }: { userId: string }) => {
  const isAnon = userId.toLowerCase().startsWith('anon');
  const [inboxCards, setInboxCards] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      subscribeToContentCards('inbox', (cards) => {
        if (!active) return;
        setInboxCards(cards);
        logContentCardImpressions(cards);
      });
    }, 500);
    return () => { active = false; clearTimeout(timer); };
  }, []);

  return (
    <div className="bg-[#101719] flex flex-col pb-32">
      {/* Page header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <div className="w-10" />
        <span className="text-[17px] font-semibold text-white">Notifications</span>
        <button type="button" className="w-10 h-10 bg-[#2C2C2E] rounded-full flex items-center justify-center">
          <Settings className="w-[20px] h-[20px] text-white" strokeWidth={1.8} />
        </button>
      </div>

      {isAnon && (
        <div className={`px-8 text-center flex flex-col items-center ${inboxCards.length > 0 ? 'mt-4 mb-6' : 'justify-center flex-1'}`}>
          <img
            src="/bell.png"
            alt="Bell"
            className="w-24 h-24 mb-8 object-contain"
          />
          <h2 className="text-[26px] font-bold text-white mb-3 leading-tight">
            Never miss an important story
          </h2>
          <p className="text-[15px] text-[#8E8E93] mb-10 leading-relaxed">
            Get push notifications for breaking news and personalized recommendations
          </p>
          <button
            type="button"
            onClick={() => brazeLogEvent('clicked_primer')}
            className="flex items-center gap-2.5 bg-[#7d2eff] active:bg-[#9a5cff] text-white font-semibold text-[16px] px-7 py-3.5 rounded-full transition-colors"
          >
            <BellRing className="w-[18px] h-[18px]" strokeWidth={2} />
            Turn on notifications
          </button>
        </div>
      )}

      {isAnon && inboxCards.length > 0 && (
        <div className="mx-4 h-px bg-[#2C2C2E] mb-6" />
      )}

      {inboxCards.length > 0 && (
        <div className="px-4 mb-4">
          <p className="text-[15px] text-[#636366] mb-3">Today</p>
          <div className="flex flex-col gap-3">
            {inboxCards.map((card) => {
              const title = card.title || card.extras?.title || '';
              const image = card.imageUrl || card.image || card.extras?.image;
              const url = card.url || card.link || card.extras?.url;
              return (
                <NotificationCard 
                  key={card.id}
                  title={title}
                  image={image}
                  time="Now"
                  onClick={() => {
                    logContentCardClick(card);
                    if (url && url !== '#') {
                      window.open(url, url.startsWith('http') ? '_blank' : '_self');
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {inboxCards.length > 0 && !isAnon && (
        <div className="mx-4 h-px bg-[#2C2C2E] mb-4" />
      )}

      {/* Earlier section (only for known users) */}
      {!isAnon && (
        <div className="px-4">
          <p className="text-[15px] text-[#636366] mb-3">Earlier</p>
          <NotificationCard 
            title="Another Hollywood Star Reveals ALS Diagnosis Months After Eric Dane's Death"
            image="/dane.png"
            time="13h"
          />
        </div>
      )}
    </div>
  );
};

// Pill-shaped bottom nav — in normal document flow (not fixed), works correctly inside phone frames
const BottomNav = ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) => {
  const tabs = [
    { id: 'home', label: 'Home', Icon: Home },
    { id: 'top', label: 'Top stories', Icon: Globe },
    { id: 'notifications', label: 'Notifications', Icon: Bell },
    { id: 'profile', label: 'Profile', Icon: User },
  ];

  return (
    <div className="bottom-nav-wrap fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
      <div className="bottom-nav-bar">
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`bottom-nav-item${active ? ' bottom-nav-item--active' : ''}`}
            >
              <Icon
                className="w-[25px] h-[25px]"
                strokeWidth={active ? 2.5 : 1.8}
                fill={active && id === 'home' ? 'currentColor' : 'none'}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ProfileView = ({ userId, onChangeUser }: { userId: string; onChangeUser: (id: string, reason: any) => void }) => {
  const [showSettings, setShowSettings] = useState(false);
  const isAnon = userId.toLowerCase().startsWith('anon');
  const [inputVal, setInputVal] = useState(isAnon ? '' : userId);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = inputVal.trim();
    if (!next) { setError('Enter a user ID.'); return; }
    setError('');
    onChangeUser(next, 'manual');
    setShowSettings(false);
  };

  return (
    <div className="bg-[#101719] relative pb-32">
      {/* Page header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-5">
        <div className="w-10" />
        <span className="text-[17px] font-semibold text-white">Profile</span>
        <button
          type="button"
          onClick={() => { setInputVal(userId.toLowerCase().startsWith('anon') ? '' : userId); setShowSettings(true); }}
          className="w-10 h-10 bg-[#2C2C2E] rounded-full flex items-center justify-center"
        >
          <Settings className="w-[20px] h-[20px] text-white" strokeWidth={1.8} />
        </button>
      </div>

      {/* User identity row */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[36px] font-bold text-[#636366] leading-tight">Sign in</h2>
            <div className="flex items-center gap-4 mt-1.5">
              <span className="flex items-center gap-1.5 text-[#636366] text-[14px]">
                <Shield className="w-3.5 h-3.5" strokeWidth={2} /> Beginner
              </span>
              <span className="flex items-center gap-1.5 text-[#636366] text-[14px]">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0l1.6 5.1H15l-4.3 3.1 1.6 5.1L8 10.2l-4.3 3.1 1.6-5.1L1 5.1h5.4z"/>
                </svg>
                2-day streak
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="w-[62px] h-[62px] rounded-full bg-[#2C2C2E] border border-[#48484A] flex items-center justify-center">
              <Smile className="w-[30px] h-[30px] text-[#636366]" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-[20px] h-[20px] bg-[#2C2C2E] border border-[#48484A] rounded-full flex items-center justify-center">
              <span className="text-[#8E8E93] text-[13px] font-bold leading-none">+</span>
            </div>
          </div>
        </div>
        <div className="h-px bg-[#2C2C2E]" />
      </div>

      {/* Empty saved articles state */}
      <div className="flex flex-col items-center justify-center mt-24 px-10 text-center">
        <Bookmark className="w-11 h-11 text-[#3A3A3C] mb-4" strokeWidth={1.5} />
        <p className="text-[17px] font-semibold text-[#636366] mb-2">No saved articles yet</p>
        <p className="text-[14px] text-[#48484A] leading-relaxed">Tap the save icon while reading to save an article for later.</p>
      </div>

      {/* Settings bottom sheet */}
      {showSettings && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowSettings(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-[#1C1C1E] rounded-t-[28px] px-6 pt-4 pb-10 z-50">
            <div className="w-10 h-1 bg-[#3A3A3C] rounded-full mx-auto mb-6" />
            <h3 className="text-[17px] font-semibold text-white mb-5">Change User ID</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="bg-[#2C2C2E] border border-[#3A3A3C] rounded-xl px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#7d2eff]"
                placeholder="Enter User ID"
              />
              {error && <p className="text-red-400 text-[13px]">{error}</p>}
              <button type="submit" className="bg-[#7d2eff] text-white py-3.5 rounded-xl font-semibold text-[15px]">
                Change user
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [currentUserId, setCurrentUserId] = useState('');
  const [feedScrolled, setFeedScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setFeedScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    window.scrollTo(0, 0);
    if (tab === 'home') brazeLogEvent('clicked_home');
    if (tab === 'top') brazeLogEvent('clicked_top_stories');
    if (tab === 'notifications') brazeLogEvent('clicked_notifications');
    if (tab === 'profile') brazeLogEvent('clicked_profile');
  }, []);
  const nativeListenerRegistered = useRef(false);
  const latestSyncRequest = useRef('');

  const safeStartWebSession = useCallback((userId: string) => {
    try { startWebSession({ userId, configId: CONFIG_ID }); }
    catch (error) { console.warn('DemoBridge startWebSession failed', error); }
  }, []);

  const safeSyncToNative = useCallback((userId: string, reason: 'manual' | 'default' | 'restore' | 'fallback' | 'admin' = 'manual') => {
    try { syncUserToNative(userId, reason as any); }
    catch (error) { console.warn('DemoBridge setUser failed', error); }
  }, []);

  const handleNativeUserUpdate = useCallback((incomingUserId: string) => {
    const trimmed = String(incomingUserId ?? '').trim();
    if (!trimmed) return;
    setCurrentUserId(trimmed);
    try { sessionStorage.setItem('yahoo_saved_user', trimmed); } catch(e) {}
    latestSyncRequest.current = trimmed;
    brazeChangeUser(trimmed);
  }, []);

  const applyUserChange = useCallback((userId: string, reason: 'manual' | 'default' | 'restore' | 'fallback' | 'admin' = 'manual') => {
    const trimmed = String(userId ?? '').trim();
    if (!trimmed) return;
    setCurrentUserId(trimmed);
    try { sessionStorage.setItem('yahoo_saved_user', trimmed); } catch(e) {}
    latestSyncRequest.current = trimmed;
    
    if (reason === 'default') { safeStartWebSession(trimmed); }
    else { safeSyncToNative(trimmed, reason); }

    if (latestSyncRequest.current === trimmed) {
      brazeChangeUser(trimmed);
    }
  }, [safeStartWebSession, safeSyncToNative]);

  useEffect(() => {
    const bootstrap = async () => {
      let retries = 0;
      while (!(window as any).DemoBridge && retries < 20) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        retries++;
      }
      if (!nativeListenerRegistered.current) {
        nativeListenerRegistered.current = true;
        try { listenForNative((incomingUserId: string) => { handleNativeUserUpdate(incomingUserId); }); }
        catch (error) { console.warn('listenForNative failed', error); }
      }
      applyUserChange(DEFAULT_USER_ID, 'default');
    };
    bootstrap();
  }, [handleNativeUserUpdate, applyUserChange]);

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-[#101719] flex flex-col relative font-sans text-white pb-[90px]">
      {activeTab === 'home' && <Header scrolled={feedScrolled} />}
      {activeTab === 'home' && <Feed />}
      {activeTab === 'profile' && (
        <ProfileView userId={currentUserId} onChangeUser={applyUserChange} />
      )}
      {activeTab === 'notifications' && (
        <NotificationsTab userId={currentUserId} />
      )}
      {activeTab === 'top' && <TopStoriesTab />}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
