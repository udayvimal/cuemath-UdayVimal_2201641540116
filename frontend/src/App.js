import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import DeckDetail from './components/DeckDetail';
import StudyBriefing from './components/StudyBriefing';
import StudySession from './components/StudySession';
import SessionComplete from './components/SessionComplete';
import Settings from './components/Settings';
import InfoModal from './components/common/InfoModal';
import { useDecks } from './hooks/useDecks';
import { getSettings } from './utils/storage';
import { computeGlobalStats, computeDeckStats } from './utils/metrics';

const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.18 } },
};

function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="splash-screen">
      <div style={{ fontSize: '3.5rem' }}>🧠</div>
      <div className="splash-logo">Cuemath Assistant</div>
      <div className="splash-sub">Study smarter. Remember forever.</div>
      <div className="splash-builder">Built by Uday Vimal · Cuemath AI Builder Challenge 2026</div>
      <div className="splash-bar-track">
        <div className="splash-bar-fill" />
      </div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState('dashboard');
  const [activeDeckId, setActiveDeckId] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [darkMode, setDarkMode] = useState(() => getSettings().darkMode);
  const [maxCards, setMaxCards] = useState(() => getSettings().maxCardsPerSession);

  const { decks, createDeck, removeDeck, updateCardSm2, getDeck, refreshDecks } = useDecks();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (screen === 'dashboard') {
      const s = getSettings();
      setDarkMode(s.darkMode);
      setMaxCards(s.maxCardsPerSession);
      refreshDecks();
    }
  }, [screen, refreshDecks]);

  const activeDeck = activeDeckId ? getDeck(activeDeckId) : null;
  const globalStats = computeGlobalStats(decks);

  const goTo = (s) => setScreen(s);

  // Go to briefing before any study session — every entry point uses this
  const goToBriefing = (deckId) => {
    setActiveDeckId(deckId);
    setScreen('briefing');
  };

  const handleUploadComplete = (apiResponse) => {
    const newDeck = createDeck(apiResponse);
    goToBriefing(newDeck.id);
  };

  const handleDeckSelect = (deckId) => {
    setActiveDeckId(deckId);
    setScreen('deck');
  };

  // Sidebar "Study Now" → pick deck with most due cards → briefing
  const handleStudyNowFromSidebar = () => {
    const best = decks
      .map(d => ({ d, s: computeDeckStats(d) }))
      .filter(({ s }) => s.dueCount > 0)
      .sort((a, b) => b.s.dueCount - a.s.dueCount)[0];
    if (best) goToBriefing(best.d.id);
  };

  const handleSessionComplete = (stats) => {
    setSessionStats(stats);
    setScreen('complete');
  };

  const handleCompleteContinue = () => {
    setScreen('dashboard');
    setActiveDeckId(null);
    refreshDecks();
  };

  // Study session is full-screen — renders outside sidebar layout
  if (!showSplash && screen === 'study' && activeDeck) {
    return (
      <StudySession
        deck={activeDeck}
        maxCards={maxCards}
        onComplete={handleSessionComplete}
        onExit={() => { setScreen('briefing'); refreshDecks(); }}
        onCardUpdate={updateCardSm2}
      />
    );
  }

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.35 } }}
          >
            <SplashScreen onDone={() => setShowSplash(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {!showSplash && (
        <div className="app">
          <Sidebar
            screen={screen}
            onNavigate={(s) => {
              if (s === 'study') { handleStudyNowFromSidebar(); return; }
              setScreen(s);
            }}
            dueCount={globalStats.totalDue}
            onInfo={() => setShowInfo(true)}
          />

          <main className="app-main">
            <div className="page-content">
              <AnimatePresence mode="wait">
                <motion.div key={screen} variants={pageVariants} initial="initial" animate="animate" exit="exit">

                  {screen === 'dashboard' && (
                    <Dashboard
                      decks={decks}
                      onUpload={() => goTo('upload')}
                      onDeckSelect={handleDeckSelect}
                      onDeleteDeck={removeDeck}
                      onViewAllDecks={() => goTo('decks')}
                    />
                  )}

                  {screen === 'upload' && (
                    <Upload onDeckCreated={handleUploadComplete} />
                  )}

                  {(screen === 'deck' || screen === 'decks') && !activeDeckId && (
                    <Dashboard
                      decks={decks}
                      onUpload={() => goTo('upload')}
                      onDeckSelect={handleDeckSelect}
                      onDeleteDeck={removeDeck}
                      showAllDecks
                    />
                  )}

                  {screen === 'briefing' && activeDeck && (
                    <StudyBriefing
                      deck={activeDeck}
                      onBegin={() => setScreen('study')}
                      onBack={() => setScreen(activeDeck ? 'deck' : 'dashboard')}
                    />
                  )}

                  {screen === 'deck' && activeDeck && (
                    <DeckDetail
                      deck={activeDeck}
                      onStartStudy={() => goToBriefing(activeDeck.id)}
                      onBack={() => { setActiveDeckId(null); goTo('dashboard'); }}
                    />
                  )}

                  {screen === 'complete' && sessionStats && activeDeck && (
                    <SessionComplete
                      sessionStats={sessionStats}
                      deckName={activeDeck.name}
                      onContinue={handleCompleteContinue}
                      onViewDeck={() => { setScreen('deck'); refreshDecks(); }}
                    />
                  )}

                  {screen === 'settings' && (
                    <Settings onBack={() => goTo('dashboard')} />
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <footer className="app-footer">
              <strong>Cuemath Assistant</strong> &nbsp;·&nbsp;
              Built with love by <strong>Uday Vimal</strong> &nbsp;·&nbsp;
              Cuemath AI Builder Challenge 2026 &nbsp;·&nbsp;
              Problem 1: The Flashcard Engine
            </footer>
          </main>

          {/* Video watermark — always visible */}
          <div className="video-watermark">
            Uday Vimal · Cuemath Challenge 2026
          </div>

          {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
        </div>
      )}
    </>
  );
}
