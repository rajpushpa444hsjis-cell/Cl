import type { Birth } from './lunar';

export type CategoryId =
  | 'career' | 'love' | 'wealth' | 'health' | 'study' | 'family'
  | 'social' | 'travel' | 'home' | 'lost' | 'news' | 'other';
/** 问事的类别。asks 是几个现成的问法，选了类别之后列出来，点一个就填好；也可以自己写。 */
export const CATEGORIES: { id: CategoryId; label: string; asks: string[] }[] = [
  { id: 'career', label: '事业', asks: ['该不该接下这份新工作？', '现在适合换工作吗？', '这次升迁轮得到我吗？', '想自己出来做，时机到了吗？', '和主管的关系要怎么处理？'] },
  { id: 'love', label: '感情', asks: ['我和他还有可能吗？', '这段感情该不该继续？', '什么时候会遇到合适的人？', '该不该主动表白？', '我们适合结婚吗？'] },
  { id: 'wealth', label: '财运', asks: ['这笔钱该不该投进去？', '今年的财运怎么样？', '借出去的钱要得回来吗？', '这门生意做得起来吗？', '合伙做这件事可靠吗？'] },
  { id: 'health', label: '健康', asks: ['最近的身体要留意什么？', '这阵子的不舒服会好转吗？', '家人的身体会平安吗？', '要怎么调养比较好？', '该不该去做个检查？'] },
  { id: 'study', label: '学业', asks: ['这次考试过得了吗？', '这个志愿选得对吗？', '要不要再考一次？', '适合出国读书吗？', '现在的读法对吗？'] },
  { id: 'family', label: '家庭', asks: ['这件事要怎么跟家里人说？', '和父母的关系会好转吗？', '孩子的事该怎么安排？', '家里最近会平安吗？', '该不该搬回去和家人住？'] },
  { id: 'social', label: '人际', asks: ['这个人值得深交吗？', '和朋友的误会解得开吗？', '同事是不是在针对我？', '这次合作的对象可靠吗？', '该不该跟他把话说开？'] },
  { id: 'travel', label: '出行', asks: ['下个月这一趟去得成吗？', '这次出门会平安吗？', '适合去外地发展吗？', '该不该出国？', '这趟行程要改期吗？'] },
  { id: 'home', label: '搬迁', asks: ['该不该搬到新的地方？', '这间房子适合买吗？', '现在适合换房子吗？', '搬家之后会比较顺吗？', '该续租还是另外找？'] },
  { id: 'lost', label: '失物', asks: ['丢的东西找得回来吗？', '东西是掉在家里还是外面？', '该往哪个方向找？', '是被人拿走了吗？', '还要继续找吗？'] },
  { id: 'news', label: '等消息', asks: ['他什么时候会回我？', '面试的结果会是好的吗？', '申请的事批得下来吗？', '等的那个人会回来吗？', '还要再等下去吗？'] },
  { id: 'other', label: '其他', asks: ['这件事该不该做？', '现在是做这件事的时机吗？', '眼前的难关过得去吗？', '我的决定是对的吗？', '接下来该往哪个方向走？'] },
];
export const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? '其他';

export interface Profile {
  nickname: string;
  birth: Birth;
}

export type ThemePref = 'system' | 'light' | 'dark';
export interface Settings {
  confirmMode: 0 | 1 | 3; // 掷筊确认：一个圣筊或连续三个圣筊；0 为不掷筊，摇到哪支取哪支
  theme: ThemePref;
  sound: boolean;
  vibrate: boolean;
}
export const DEFAULT_SETTINGS: Settings = { confirmMode: 1, theme: 'system', sound: true, vibrate: true };

export type Outcome = 'pending' | 'yes' | 'no';
export interface JournalEntry {
  id: string;
  ts: number;
  dateKey: string;
  solarText: string;
  lunarText: string;
  dayGz: string;
  category: CategoryId;
  question: string;
  qianNo: number;
  qianGz: string;
  grade: string;
  outcome: Outcome;
  note: string;
  /** 凶签系在签架上：不列在签本里，改放在签架。 */
  tied?: boolean;
}

const K = {
  profile: 'jryq.profile.v1',
  settings: 'jryq.settings.v1',
  journal: 'jryq.journal.v1',
};

function read<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadProfile = () => read<Profile | null>(K.profile, null);
export const saveProfile = (p: Profile) => write(K.profile, p);
export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(K.settings, {}) });
export const saveSettings = (s: Settings) => write(K.settings, s);
export const loadJournal = () => read<JournalEntry[]>(K.journal, []);
export const saveJournal = (j: JournalEntry[]) => write(K.journal, j);

export function newId(): string {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return Date.now().toString(36) + a[0].toString(36) + a[1].toString(36);
}

export interface Backup {
  app: 'jinri-yiqian';
  version: 1;
  exportedAt: string;
  profile: Profile | null;
  settings: Settings;
  journal: JournalEntry[];
}

export function makeBackup(): Backup {
  return {
    app: 'jinri-yiqian',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: loadProfile(),
    settings: loadSettings(),
    journal: loadJournal(),
  };
}

/** 验证并回传备份内容；格式不符时丢出错误。 */
export function parseBackup(text: string): Backup {
  const b = JSON.parse(text) as Backup;
  if (b?.app !== 'jinri-yiqian' || !Array.isArray(b.journal)) throw new Error('不是清吉的备份文件');
  return b;
}

export function clearAll(): void {
  try {
    Object.values(K).forEach((k) => localStorage.removeItem(k));
  } catch {
    /* 忽略 */
  }
}
