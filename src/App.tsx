import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Home, Globe, Bell, User, MessageCircle, Bookmark, Share, Play, MoreHorizontal, X, ArrowLeft } from 'lucide-react';
import { startWebSession, setUser as syncUserToNative, listenForNative } from '../solcon-starter/demo_bridge_entry';
import personaMap from '../solcon-starter/persona-map.json';

const CONFIG_ID = 'yahoo';
const DEFAULT_USER_ID = (personaMap as any).defaultUserId || (personaMap as any).personas?.[0]?.userId || 'us1';

const personaByUserId = new Map(
  ((personaMap as any).personas || []).map((persona: any) => [persona.userId, persona])
);

function getWelcomeFirstName(userId: string) {
  const persona = personaByUserId.get(userId) as any;
  if (persona?.firstName) return persona.firstName;
  const base = userId.split(/[@.]/)[0];
  if (!base) return 'there';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

const Header = () => (
  <header className="sticky top-0 z-40 bg-[#121212] pt-14 pb-0 border-b border-[#2a2a2a]">
    <div className="flex justify-between items-center mb-4 px-4">
      <div className="w-8"></div> {/* Spacer for centering */}
      <h1 className="text-[28px] font-bold italic tracking-tighter">
        yahoo<span className="text-[#7d2eff]">!</span> news
      </h1>
      <button className="p-2 -mr-2"><Search className="w-6 h-6 text-white" strokeWidth={2.5} /></button>
    </div>
    
    <div className="flex overflow-x-auto hide-scrollbar text-[15px] font-semibold text-[#8a8a8e] px-4">
      <button className="text-white pb-3 mr-6 border-b-2 border-[#7d2eff] whitespace-nowrap">For You</button>
      <button className="pb-3 mr-6 whitespace-nowrap">U.S. politics</button>
      <button className="pb-3 mr-6 whitespace-nowrap">Celebs</button>
      <button className="pb-3 mr-6 whitespace-nowrap">Recipes</button>
      <button className="pb-3 whitespace-nowrap">Tech</button>
    </div>
  </header>
);

const Feed = () => (
  <main className="flex-1 overflow-y-auto pb-28 pt-4 px-4 bg-[#121212] space-y-4">
    {/* Keep reading card */}
    <div className="bg-[#2a2a2c] rounded-2xl p-4 shadow-sm border border-[#3a3a3c]">
      <h2 className="font-semibold mb-6 text-[17px]">Keep reading to level up.</h2>
      <div className="w-full bg-[#4a4a4c] rounded-full h-1 mb-3">
        <div className="bg-[#8e8e93] h-1 rounded-full" style={{ width: '85%' }}></div>
      </div>
      <p className="text-[15px] text-[#8e8e93]">10 more reads to reach Seeker level.</p>
    </div>

    {/* Morning Briefing card */}
    <div className="bg-[#2a2a2c] rounded-2xl p-4 relative shadow-sm border border-[#3a3a3c]">
      <div className="flex items-center gap-1.5 mb-3 text-[#af79ff] font-semibold text-[15px]">
        <span className="text-lg leading-none mt-[-2px]">✦</span> Morning Briefing
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <h2 className="font-bold text-[20px] leading-[1.25] mb-5 text-[#f2f2f7]">Colbert's final 'Late Show' episode airs, NASCAR's Kyle Busch dies at 41, and GOP divisions stall Trump agenda</h2>
          <div className="flex items-center gap-3">
            <button className="w-[42px] h-[42px] bg-[#3a3a3c] rounded-full flex items-center justify-center pl-1 hover:bg-[#4a4a4c]">
              <Play className="w-5 h-5 text-[#af79ff]" fill="currentColor" />
            </button>
            <div className="flex-1 flex gap-[2px] items-center h-8">
              {Array.from({length: 24}).map((_, i) => (
                <div key={i} className="w-[3px] bg-[#8e8e93] rounded-full" style={{height: `${Math.max(20, Math.random() * 100)}%`}}></div>
              ))}
            </div>
            <span className="text-[14px] text-[#8e8e93]">02:44</span>
          </div>
        </div>
        <div className="w-[88px] h-[88px] bg-black rounded-xl shrink-0 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=100&h=100&fit=crop" className="w-full h-full object-cover opacity-90" alt="Late Show" />
        </div>
      </div>
    </div>

    {/* Big Article Card */}
    <div className="bg-[#2a2a2c] rounded-2xl overflow-hidden shadow-sm border border-[#3a3a3c]">
      <div className="h-[220px] bg-black w-full overflow-hidden">
        <img src="https://images.unsplash.com/photo-1541872703868-3e4b097b399d?w=600&h=400&fit=crop" className="w-full h-full object-cover opacity-90" alt="Kevin Warsh" />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#7d2eff] flex items-center justify-center text-[10px] font-black text-white">Y!</div>
            <span className="font-medium text-[15px]">Yahoo Finance</span>
            <span className="text-[#8e8e93] text-[15px]">42m</span>
          </div>
          <button><MoreHorizontal className="w-5 h-5 text-[#8e8e93]" /></button>
        </div>
        <h2 className="font-bold text-[22px] leading-[1.2] mb-5 text-[#f2f2f7]">Kevin Warsh sworn in as Fed chair as inflation worries raise the volume on possible rate hikes</h2>
        <div className="flex items-center justify-between text-[#8e8e93]">
          <div className="flex gap-7">
            <button className="flex items-center gap-2"><MessageCircle className="w-[22px] h-[22px]" /> <span className="text-[15px] font-medium">1.9K</span></button>
            <button><Bookmark className="w-[22px] h-[22px]" /></button>
            <button><Share className="w-[22px] h-[22px]" /></button>
          </div>
          <div className="flex items-center gap-1.5 text-[15px] font-medium">
            <span className="w-5 h-5 border-[2.5px] border-[#8e8e93] rounded-full flex items-center justify-center text-[10px] font-bold">o</span> 12K
          </div>
        </div>
      </div>
    </div>
    
    {/* Small Article 1 */}
    <div className="bg-[#2a2a2c] rounded-2xl p-4 shadow-sm border border-[#3a3a3c]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-[12px] font-bold border border-[#4a4a4c] text-white">V</div>
          <span className="font-medium text-[15px]">Variety</span>
          <span className="text-[#8e8e93] text-[15px]">7h</span>
        </div>
        <button><MoreHorizontal className="w-5 h-5 text-[#8e8e93]" /></button>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <h2 className="font-bold text-[19px] leading-[1.25] mb-5 text-[#f2f2f7]">Penelope Cruz Reveals She Was Warned of Brain Aneurysm Mid-Shoot on Cannes Favorite 'The Black Ball': 'I Thought I Was About to Die'</h2>
          <div className="flex items-center gap-7 text-[#8e8e93]">
            <button><MessageCircle className="w-[22px] h-[22px]" /></button>
            <button><Bookmark className="w-[22px] h-[22px]" /></button>
            <button><Share className="w-[22px] h-[22px]" /></button>
          </div>
        </div>
        <div className="w-[88px] h-[88px] bg-black rounded-xl shrink-0 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop" className="w-full h-full object-cover opacity-90" alt="Penelope Cruz" />
        </div>
      </div>
    </div>
  </main>
);

const BottomNav = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) => (
  <div className="fixed bottom-0 left-0 right-0 w-full bg-[#1c1c1e] border-t border-[#3a3a3c] pb-safe pt-2 px-6 flex justify-between items-center z-50">
    <div className="w-full max-w-md mx-auto flex justify-between items-center px-4 pb-2">
      <button onClick={() => onTabChange('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-[#af79ff]' : 'text-[#8e8e93]'}`}>
        <div className={`p-1.5 rounded-full ${activeTab === 'home' ? 'bg-[#7d2eff]/20' : ''}`}>
          <Home className="w-6 h-6" fill={activeTab === 'home' ? 'currentColor' : 'none'} />
        </div>
        <span className="text-[11px] font-medium">Home</span>
      </button>
      <button onClick={() => onTabChange('top')} className={`flex flex-col items-center gap-1 ${activeTab === 'top' ? 'text-[#af79ff]' : 'text-[#8e8e93]'}`}>
        <div className="p-1.5"><Globe className="w-6 h-6" /></div>
        <span className="text-[11px] font-medium">Top stories</span>
      </button>
      <button onClick={() => onTabChange('notifications')} className={`flex flex-col items-center gap-1 ${activeTab === 'notifications' ? 'text-[#af79ff]' : 'text-[#8e8e93]'}`}>
        <div className="p-1.5"><Bell className="w-6 h-6" /></div>
        <span className="text-[11px] font-medium">Notifications</span>
      </button>
      <button onClick={() => onTabChange('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-[#af79ff]' : 'text-[#8e8e93]'}`}>
        <div className="p-1.5"><User className="w-6 h-6" /></div>
        <span className="text-[11px] font-medium">Profile</span>
      </button>
    </div>
  </div>
);

const ProfileTab = ({ userId, onBack, onChangeUser }: { userId: string, onBack: () => void, onChangeUser: (id: string) => void }) => {
  const [inputVal, setInputVal] = useState(userId);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextUser = inputVal.trim();
    if (!nextUser) {
      setError('Enter a user ID.');
      return;
    }
    setError('');
    onChangeUser(nextUser);
  };

  return (
    <div className="fixed inset-0 bg-[#121212] z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4">
      <header className="flex items-center p-4 border-b border-gray-800 pt-12">
        <button onClick={onBack} className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold ml-2">Profile & settings</h1>
      </header>
      
      <div className="p-4 mt-4">
        <div className="bg-[#1e1e1e] rounded-xl p-4 border border-gray-800">
          <h2 className="text-lg font-bold mb-4">User ID</h2>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input 
              type="text" 
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7d2eff]"
              placeholder="Enter User ID"
            />
            <button 
              type="submit" 
              className="bg-[#7d2eff] hover:bg-[#6824db] text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
            >
              Change user
            </button>
          </form>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
        
        <div className="mt-8 bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800">
          <button className="w-full text-left p-4 border-b border-gray-800 flex justify-between items-center hover:bg-[#2a2a2a]">
            <span className="font-medium">Manage Account</span>
            <span className="text-gray-500">›</span>
          </button>
          <button className="w-full text-left p-4 border-b border-gray-800 flex justify-between items-center hover:bg-[#2a2a2a]">
            <span className="font-medium">Notifications</span>
            <span className="text-gray-500">›</span>
          </button>
          <button onClick={() => onChangeUser(DEFAULT_USER_ID)} className="w-full text-left p-4 flex justify-between items-center hover:bg-[#2a2a2a] text-red-400">
            <span className="font-medium">Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [currentUserId, setCurrentUserId] = useState('');
  const nativeListenerRegistered = useRef(false);

  const safeStartWebSession = useCallback((userId: string) => {
    try {
      startWebSession({ userId, configId: CONFIG_ID });
    } catch (error) {
      console.warn('DemoBridge startWebSession failed', error);
    }
  }, []);

  const safeSyncToNative = useCallback((userId: string, reason: 'manual' | 'default' | 'restore' | 'fallback' | 'admin' = 'manual') => {
    try {
      syncUserToNative(userId, reason as any);
    } catch (error) {
      console.warn('DemoBridge setUser failed', error);
    }
  }, []);

  const handleNativeUserUpdate = useCallback((incomingUserId: string) => {
    const trimmed = String(incomingUserId ?? '').trim();
    if (!trimmed) return;
    setCurrentUserId(trimmed);
  }, []);

  const applyUserChange = useCallback((userId: string, reason: 'manual' | 'default' | 'restore' | 'fallback' | 'admin' = 'manual') => {
    const trimmed = String(userId ?? '').trim();
    if (!trimmed) return;
    
    setCurrentUserId(trimmed);
    
    if (reason === 'default') {
      safeStartWebSession(trimmed);
    } else {
      safeSyncToNative(trimmed, reason);
    }
  }, [safeStartWebSession, safeSyncToNative]);

  useEffect(() => {
    const bootstrap = async () => {
      // Poll for DemoBridge to avoid WebReadyTimeout on native layer
      let retries = 0;
      while (!(window as any).DemoBridge && retries < 20) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        retries++;
      }

      if (!nativeListenerRegistered.current) {
        nativeListenerRegistered.current = true;
        try {
          listenForNative((incomingUserId: string) => {
            handleNativeUserUpdate(incomingUserId);
          });
        } catch (error) {
          console.warn('listenForNative failed', error);
        }
      }

      applyUserChange(DEFAULT_USER_ID, 'default');
    };

    bootstrap();
  }, [handleNativeUserUpdate, applyUserChange]);

  return (
    <div className="h-screen w-full max-w-md mx-auto bg-[#121212] flex flex-col relative font-sans text-white">
      <Header />
      <Feed />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === 'profile' && (
        <ProfileTab 
          userId={currentUserId} 
          onBack={() => setActiveTab('home')} 
          onChangeUser={(id) => {
            applyUserChange(id, 'manual');
            setActiveTab('home');
          }} 
        />
      )}
    </div>
  );
}