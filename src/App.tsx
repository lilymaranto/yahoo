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
  <header className="sticky top-0 z-40 bg-[#121212] pt-12 pb-2 px-4 border-b border-gray-800">
    <div className="flex justify-between items-center mb-4">
      <div className="w-6"></div> {/* Spacer for centering */}
      <h1 className="text-2xl font-bold italic tracking-tighter">
        yahoo<span className="text-[#7d2eff]">!</span> news
      </h1>
      <button className="p-2"><Search className="w-6 h-6" /></button>
    </div>
    
    <div className="flex gap-6 overflow-x-auto hide-scrollbar text-sm font-semibold text-gray-400">
      <button className="text-white pb-2 border-b-2 border-[#7d2eff] whitespace-nowrap">For You</button>
      <button className="pb-2 whitespace-nowrap">U.S. politics</button>
      <button className="pb-2 whitespace-nowrap">Celebs</button>
      <button className="pb-2 whitespace-nowrap">Recipes</button>
      <button className="pb-2 whitespace-nowrap">Tech</button>
    </div>
  </header>
);

const Feed = () => (
  <main className="flex-1 overflow-y-auto pb-24 pt-4 px-4 bg-[#121212] space-y-4">
    {/* Keep reading card */}
    <div className="bg-[#1e1e1e] rounded-xl p-4">
      <h2 className="font-semibold mb-4">Keep reading to level up.</h2>
      <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
        <div className="bg-gray-400 h-1.5 rounded-full" style={{ width: '85%' }}></div>
      </div>
      <p className="text-sm text-gray-400">10 more reads to reach Seeker level.</p>
    </div>

    {/* Morning Briefing card */}
    <div className="bg-[#1e1e1e] rounded-xl p-4 relative">
      <div className="flex items-center gap-2 mb-2 text-[#7d2eff] font-semibold text-sm">
        <span className="text-lg">✦</span> Morning Briefing
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <h2 className="font-bold text-xl leading-tight mb-4">Colbert's final 'Late Show' episode airs, NASCAR's Kyle Busch dies at 41, and GOP divisions stall Trump agenda</h2>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 bg-[#7d2eff] rounded-full flex items-center justify-center pl-1">
              <Play className="w-5 h-5 text-white" fill="currentColor" />
            </button>
            <div className="flex-1 flex gap-1 items-end h-6">
              {Array.from({length: 20}).map((_, i) => (
                <div key={i} className="w-1 bg-gray-500 rounded-t" style={{height: `${Math.random() * 100}%`}}></div>
              ))}
            </div>
            <span className="text-sm text-gray-400">02:44</span>
          </div>
        </div>
        <div className="w-20 h-20 bg-gray-800 rounded-lg shrink-0 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=80&h=80&fit=crop" className="w-full h-full object-cover" alt="Late Show" />
        </div>
      </div>
    </div>

    {/* Big Article Card */}
    <div className="bg-[#1e1e1e] rounded-xl overflow-hidden">
      <div className="h-48 bg-gray-800 w-full overflow-hidden">
        <img src="https://images.unsplash.com/photo-1541872703868-3e4b097b399d?w=500&h=300&fit=crop" className="w-full h-full object-cover" alt="Kevin Warsh" />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#7d2eff] flex items-center justify-center text-xs font-bold">Y!</div>
            <span className="font-semibold text-sm">Yahoo Finance</span>
            <span className="text-gray-500 text-sm">42m</span>
          </div>
          <button><MoreHorizontal className="w-5 h-5 text-gray-400" /></button>
        </div>
        <h2 className="font-bold text-xl leading-tight mb-4">Kevin Warsh sworn in as Fed chair as inflation worries raise the volume on possible rate hikes</h2>
        <div className="flex items-center justify-between text-gray-400">
          <div className="flex gap-6">
            <button className="flex items-center gap-1.5"><MessageCircle className="w-5 h-5" /> 1.9K</button>
            <button><Bookmark className="w-5 h-5" /></button>
            <button><Share className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span className="w-4 h-4 border-2 border-gray-400 rounded-full flex items-center justify-center">O</span> 12K
          </div>
        </div>
      </div>
    </div>
    
    {/* Small Article 1 */}
    <div className="bg-[#1e1e1e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-xs font-bold border border-gray-700">V</div>
          <span className="font-semibold text-sm">Variety</span>
          <span className="text-gray-500 text-sm">7h</span>
        </div>
        <button><MoreHorizontal className="w-5 h-5 text-gray-400" /></button>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <h2 className="font-bold text-lg leading-tight mb-4">Penelope Cruz Reveals She Was Warned of Brain Aneurysm Mid-Shoot on Cannes Favorite 'The Black Ball': 'I Thought I Was About to Die'</h2>
          <div className="flex items-center gap-6 text-gray-400">
            <button><MessageCircle className="w-5 h-5" /></button>
            <button><Bookmark className="w-5 h-5" /></button>
            <button><Share className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="w-20 h-20 bg-gray-800 rounded-lg shrink-0 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop" className="w-full h-full object-cover" alt="Penelope Cruz" />
        </div>
      </div>
    </div>
  </main>
);

const BottomNav = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#1e1e1e]/90 backdrop-blur-md rounded-full px-6 py-3 flex justify-between items-center border border-gray-800 shadow-2xl z-50">
    <button onClick={() => onTabChange('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-[#7d2eff]' : 'text-gray-400'}`}>
      <div className={`p-1.5 rounded-full ${activeTab === 'home' ? 'bg-[#7d2eff]/20' : ''}`}>
        <Home className="w-6 h-6" fill={activeTab === 'home' ? 'currentColor' : 'none'} />
      </div>
      <span className="text-[10px] font-semibold">Home</span>
    </button>
    <button onClick={() => onTabChange('top')} className={`flex flex-col items-center gap-1 ${activeTab === 'top' ? 'text-[#7d2eff]' : 'text-gray-400'}`}>
      <div className="p-1.5"><Globe className="w-6 h-6" /></div>
      <span className="text-[10px] font-semibold">Top stories</span>
    </button>
    <button onClick={() => onTabChange('notifications')} className={`flex flex-col items-center gap-1 ${activeTab === 'notifications' ? 'text-[#7d2eff]' : 'text-gray-400'}`}>
      <div className="p-1.5"><Bell className="w-6 h-6" /></div>
      <span className="text-[10px] font-semibold">Notifications</span>
    </button>
    <button onClick={() => onTabChange('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-[#7d2eff]' : 'text-gray-400'}`}>
      <div className="p-1.5"><User className="w-6 h-6" /></div>
      <span className="text-[10px] font-semibold">Profile</span>
    </button>
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

  const safeSyncToNative = useCallback((userId: string, reason = 'manual') => {
    try {
      syncUserToNative(userId, reason);
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