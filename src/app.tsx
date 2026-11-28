import { useEffect, useMemo, useState } from 'preact/hooks';
import { ProfileForm } from './components/ProfileForm';
import { Icon } from './components/ui';
import { setSoundEnabled } from './lib/audio';
import { dailyGua } from './lib/dailyGua';
import { dailyFortune } from './lib/fortune';
import { setVibrateEnabled } from './lib/haptics';
import { addDays, computeBazi, dateKey, getDayInfo, parseKey } from './lib/lunar';
import { dueReviews } from './lib/review';
import { applyUpdate, onUpdateReady } from './lib/update';
import {
  type Backup,
  type JournalEntry,
  type Person,
  type Profile,
  SELF,
  type Settings as S,
  clearAll,
  loadActive,
  loadJournal,
  loadPeople,
  loadProfile,
  loadSettings,
  saveActive,
  saveJournal,
  savePeople,
  saveProfile,
  saveSettings,
} from './lib/storage';
import type { AskMode } from './components/AskPicker';
import { Divine } from './screens/Divine';
import { Draw } from './screens/Draw';
import { ZeRi } from './screens/ZeRi';
import { Home } from './screens/Home';
import { Journal } from './screens/Journal';
import { Settings } from './screens/Settings';

type Tab = 'home' | 'draw' | 'journal' | 'settings';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: '今日', icon: 'today' },
  { id: 'draw', label: '问事', icon: 'draw' },
  { id: 'journal', label: '签本', icon: 'book' },
  { id: 'settings', label: '设置', icon: 'settings' },
];

// 启动时外层（例如预览连结的检视器）可能已设置 data-theme，“跟随系统”时还原它
const hostTheme = document.documentElement.dataset.theme;

function applyTheme(pref: S['theme']) {
  const root = document.documentElement;
  if (pref === 'system') {
    if (hostTheme) root.dataset.theme = hostTheme;
    else delete root.dataset.theme;
  } else root.dataset.theme = pref;
  const effective = pref === 'system' ? hostTheme : pref;
  const dark = effective ? effective === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f0f10' : '#ffffff');
}

export function App() {
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [settings, setSettings] = useState<S>(loadSettings);
  const [journal, setJournal] = useState<JournalEntry[]>(loadJournal);
  const [tab, setTab] = useState<Tab>('home');
  const [journalView, setJournalView] = useState<'book' | 'rack'>('book');
  const [askMode, setAskMode] = useState<AskMode>('qian'); // 问事：求签或起卦
  const [now, setNow] = useState(() => new Date());
  const [people, setPeople] = useState<Person[]>(loadPeople); // 家人
  const [activeId, setActiveId] = useState<string>(loadActive); // 现在看的是谁
  const [viewKey, setViewKey] = useState<string | null>(null); // 首页正在看的日子；null 为今天
  const [updateReady, setUpdateReady] = useState(false); // 新版本装好了，等着点一下更新
  useEffect(() => onUpdateReady(() => setUpdateReady(true)), []);

  // 主题、音效、震动
  useEffect(() => {
    applyTheme(settings.theme);
    setSoundEnabled(settings.sound);
    setVibrateEnabled(settings.vibrate);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => applyTheme(settings.theme);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [settings]);

  // 跨日时自动更新（回到前景或每分钟检查）
  useEffect(() => {
    const tick = () => setNow((old) => (dateKey(old) === dateKey(new Date()) ? old : new Date()));
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const todayKey = dateKey(now);
  const day = useMemo(() => getDayInfo(now), [todayKey]);
  // 现在看的这个人：自己，或切换到的某位家人（找不到就回到自己）
  const current: Profile | null = useMemo(() => people.find((p) => p.id === activeId) ?? profile, [people, activeId, profile]);
  const forOther = !!current && current !== profile;
  const seed = current ? `${current.nickname}|${current.birth.y}${current.birth.m}${current.birth.d}` : '';
  const bazi = useMemo(() => (current ? computeBazi(current.birth) : null), [current]);
  const fortune = useMemo(() => (current && bazi ? dailyFortune(bazi, day, seed) : null), [current, bazi, day]);
  const gua = useMemo(() => (current ? dailyGua(current.birth, day.key) : null), [current, day]);

  // 首页可以从月历点到别的日子；求签一律用今天
  const viewing = viewKey && viewKey !== todayKey ? viewKey : null;
  const viewDay = useMemo(() => (viewing ? getDayInfo(parseKey(viewing)) : day), [viewing, day]);
  const viewFortune = useMemo(() => (viewing && current && bazi ? dailyFortune(bazi, viewDay, seed) : fortune), [viewing, current, bazi, viewDay, fortune]);
  const viewGua = useMemo(() => (viewing && current ? dailyGua(current.birth, viewDay.key) : gua), [viewing, current, viewDay, gua]);

  const due = useMemo(() => dueReviews(journal, todayKey), [journal, todayKey]);

  const switchTab = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const updateSettings = (s: S) => {
    setSettings(s);
    saveSettings(s);
  };
  const updateJournal = (j: JournalEntry[]) => {
    setJournal(j);
    saveJournal(j);
  };
  const patchEntry = (id: string, patch: Partial<JournalEntry>) => updateJournal(journal.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const updatePeople = (list: Person[]) => {
    setPeople(list);
    savePeople(list);
    if (activeId !== SELF && !list.some((p) => p.id === activeId)) switchPerson(SELF); // 正在看的人被删了，回到自己
  };
  const switchPerson = (id: string) => {
    setActiveId(id);
    saveActive(id);
  };

  if (!profile || !current || !bazi || !fortune || !gua || !viewFortune || !viewGua) {
    return (
      <div class="app onboarding">
        <header class="cover">
          <h1 class="cover-title">清吉</h1>
          <p class="cover-sub">每日一卦，掷筊求签</p>
        </header>
        <div class="card">
          <ProfileForm
            submitLabel="开始使用"
            onSubmit={(p) => {
              saveProfile(p);
              setProfile(p);
            }}
          />
        </div>
        <p class="aside">资料只存在这部手机里</p>
      </div>
    );
  }

  return (
    <div class="app">
      {updateReady && (
        <button class="update-pill" onClick={applyUpdate}>
          有新版本・点一下更新
        </button>
      )}
      <main>
        <div hidden={tab !== 'home'}>
          <Home
            profile={current}
            bazi={bazi}
            day={viewDay}
            isToday={!viewing}
            todayKey={todayKey}
            fortune={viewFortune}
            gua={viewGua}
            drawLabel={settings.confirmMode === 0 ? '求签' : '掷筊求签'}
            onDraw={() => {
              setAskMode('qian');
              switchTab('draw');
            }}
            onPickDay={setViewKey}
            people={[{ id: SELF, nickname: profile.nickname }, ...people]}
            activeId={forOther ? activeId : SELF}
            onSwitch={switchPerson}
            due={due}
            onReview={(id, answer) =>
              patchEntry(id, answer === 'later' ? { reviewAt: addDays(todayKey, 7) } : { outcome: answer })
            }
          />
        </div>
        <div hidden={tab !== 'draw' || askMode !== 'qian'}>
          <Draw
            active={tab === 'draw' && askMode === 'qian'}
            mode={askMode}
            onMode={setAskMode}
            profile={current}
            who={forOther ? current.nickname : undefined}
            bazi={bazi}
            day={day}
            fortune={fortune}
            settings={settings}
            onSave={(e) => updateJournal([e, ...journal])}
            onTie={(id) => patchEntry(id, { tied: true, reviewAt: undefined })}
            onReview={(id, reviewAt) => patchEntry(id, { reviewAt })}
            onOpenJournal={(view) => {
              setJournalView(view);
              switchTab('journal');
            }}
          />
        </div>
        <div hidden={tab !== 'draw' || askMode !== 'gua'}>
          <Divine
            active={tab === 'draw' && askMode === 'gua'}
            mode={askMode}
            onMode={setAskMode}
            profile={current}
            who={forOther ? current.nickname : undefined}
            day={day}
            onSave={(e) => updateJournal([e, ...journal])}
            onReview={(id, reviewAt) => patchEntry(id, { reviewAt })}
            onOpenJournal={() => {
              setJournalView('book');
              switchTab('journal');
            }}
          />
        </div>
        <div hidden={tab !== 'draw' || askMode !== 'date'}>
          <ZeRi
            bazi={bazi}
            todayKey={todayKey}
            who={forOther ? current.nickname : undefined}
            mode={askMode}
            onMode={setAskMode}
            onShowDay={(key) => {
              setViewKey(key === todayKey ? null : key);
              switchTab('home');
            }}
          />
        </div>
        {tab === 'journal' && (
          <Journal
            journal={journal}
            nickname={profile.nickname}
            view={journalView}
            onView={setJournalView}
            onUpdate={patchEntry}
            onDelete={(id) => updateJournal(journal.filter((e) => e.id !== id))}
            onDraw={() => {
              setAskMode('qian');
              switchTab('draw');
            }}
          />
        )}
        {tab === 'settings' && (
          <Settings
            profile={profile}
            people={people}
            onPeople={updatePeople}
            settings={settings}
            onProfile={(p) => {
              saveProfile(p);
              setProfile(p);
            }}
            onSettings={updateSettings}
            onImport={(b: Backup) => {
              if (b.profile) {
                saveProfile(b.profile);
                setProfile(b.profile);
              }
              updateSettings({ ...settings, ...b.settings });
              updateJournal(b.journal);
              updatePeople(b.people ?? []);
            }}
            onClear={() => {
              clearAll();
              setJournal([]);
              setSettings(loadSettings());
              setPeople([]);
              setActiveId(SELF);
              setViewKey(null);
              setProfile(null);
              setTab('home');
            }}
          />
        )}
      </main>
      <nav class="tabbar" aria-label="主菜单">
        {TABS.map((t) => (
          <button key={t.id} class={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => switchTab(t.id)}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
