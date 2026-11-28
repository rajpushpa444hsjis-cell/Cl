import type { Birth } from './lunar';

export type CategoryId =
  | 'career' | 'love' | 'wealth' | 'health' | 'study' | 'family'
  | 'social' | 'travel' | 'home' | 'lost' | 'news' | 'other';
/** 问事的类别。asks 是现成的问法（每类十五个），选了类别之后一次列五个、可以换一批，点一个就填好；也可以自己写。 */
export const CATEGORIES: { id: CategoryId; label: string; asks: string[] }[] = [
  { id: 'career', label: '事业', asks: ['该不该接下这份新工作？', '现在适合换工作吗？', '这次升迁轮得到我吗？', '想自己出来做，时机到了吗？', '和主管的关系要怎么处理？', '这次面试能过吗？', '加薪的事该不该开口？', '这个项目做得成吗？', '会不会被裁员？', '现在的工作还要待多久？', '要不要接受外派？', '同事间的竞争该怎么应对？', '转行的方向对吗？', '年底的考核会顺利吗？', '副业值得投入吗？'] },
  { id: 'love', label: '感情', asks: ['我和他还有可能吗？', '这段感情该不该继续？', '什么时候会遇到合适的人？', '该不该主动表白？', '我们适合结婚吗？', '他心里有我吗？', '这次吵架能和好吗？', '异地恋能撑下去吗？', '前任还会回来吗？', '家人会接受他吗？', '这段暧昧会有结果吗？', '我该放手了吗？', '他是对的人吗？', '相亲认识的这位合适吗？', '我们之间的问题出在哪？'] },
  { id: 'wealth', label: '财运', asks: ['这笔钱该不该投进去？', '今年的财运怎么样？', '借出去的钱要得回来吗？', '这门生意做得起来吗？', '合伙做这件事可靠吗？', '这个月的开销守得住吗？', '现在适合买房吗？', '手上的股票该卖吗？', '该不该借钱给朋友？', '年底的奖金会多吗？', '欠的债什么时候还得清？', '这份兼职值得做吗？', '存钱的计划做得到吗？', '这次的投资会亏吗？', '该不该换个理财方式？'] },
  { id: 'health', label: '健康', asks: ['最近的身体要留意什么？', '这阵子的不舒服会好转吗？', '家人的身体会平安吗？', '要怎么调养比较好？', '该不该去做个检查？', '最近睡不好，要怎么调整？', '这阵子的压力会过去吗？', '运动的计划坚持得下去吗？', '换季的时候要注意什么？', '心情低落会好起来吗？', '减重这件事能成吗？', '老毛病会不会复发？', '饮食上要注意什么？', '该不该多休息一阵子？', '长辈的身体该怎么照顾？'] },
  { id: 'study', label: '学业', asks: ['这次考试过得了吗？', '这个志愿选得对吗？', '要不要再考一次？', '适合出国读书吗？', '现在的读法对吗？', '升学考试考得上吗？', '这门课能及格吗？', '该选哪个科系？', '毕业论文能顺利完成吗？', '证照考试能一次过吗？', '该不该报补习班？', '读书总分心怎么办？', '留学申请会成功吗？', '口试能表现好吗？', '这个学习计划可行吗？'] },
  { id: 'family', label: '家庭', asks: ['这件事要怎么跟家里人说？', '和父母的关系会好转吗？', '孩子的事该怎么安排？', '家里最近会平安吗？', '该不该搬回去和家人住？', '家里的争执能平息吗？', '该不该要孩子？', '孩子最近的状况要担心吗？', '和另一半的家人处得来吗？', '父母的意见该不该听？', '兄弟姊妹的问题怎么解？', '家里的开销该怎么分？', '长辈该由谁来照顾？', '过年回不回家比较好？', '要不要养一只宠物？'] },
  { id: 'social', label: '人际', asks: ['这个人值得深交吗？', '和朋友的误会解得开吗？', '同事是不是在针对我？', '这次合作的对象可靠吗？', '该不该跟他把话说开？', '新环境里交得到朋友吗？', '该不该拒绝他的请求？', '这段友情还要维持吗？', '他说的话可以相信吗？', '有人在背后说我吗？', '这个聚会该不该去？', '难相处的人该怎么应对？', '这次帮忙会被记得吗？', '和邻居的问题能解决吗？', '该不该主动联系老朋友？'] },
  { id: 'travel', label: '出行', asks: ['下个月这一趟去得成吗？', '这次出门会平安吗？', '适合去外地发展吗？', '该不该出国？', '这趟行程要改期吗？', '这次旅行会顺利吗？', '出差能把事情办成吗？', '一个人去旅行可以吗？', '开车出远门要注意什么？', '签证办得下来吗？', '这趟回乡路上平安吗？', '那个城市适合我吗？', '跟团还是自由行好？', '出发的日子要不要换？', '航班会顺利吗？'] },
  { id: 'home', label: '搬迁', asks: ['该不该搬到新的地方？', '这间房子适合买吗？', '现在适合换房子吗？', '搬家之后会比较顺吗？', '该续租还是另外找？', '这间房子住得安稳吗？', '该不该和人合租？', '装修会顺利吗？', '房东会不会涨租？', '新家的邻居好相处吗？', '买房要不要再等等？', '卖房的时机到了吗？', '搬去另一个城市好吗？', '房贷的压力撑得住吗？', '要不要搬到离公司近的地方？'] },
  { id: 'lost', label: '失物', asks: ['丢的东西找得回来吗？', '东西是掉在家里还是外面？', '该往哪个方向找？', '是被人拿走了吗？', '还要继续找吗？', '走失的宠物会回来吗？', '钱包还找得到吗？', '证件要不要先挂失？', '是不是忘在别人那里了？', '东西会自己出现吗？', '什么时候能找到？', '要不要报警处理？', '请人帮忙找会快一点吗？', '遗失的资料还救得回来吗？', '这次的损失大吗？'] },
  { id: 'news', label: '等消息', asks: ['他什么时候会回我？', '面试的结果会是好的吗？', '申请的事批得下来吗？', '等的那个人会回来吗？', '还要再等下去吗？', '录取通知会来吗？', '检查报告的结果会好吗？', '他会主动联系我吗？', '这件事什么时候有结果？', '合约会签下来吗？', '贷款批得下来吗？', '远方的家人有好消息吗？', '对方会接受这次的报价吗？', '拖着的事会有进展吗？', '等不到回音该怎么办？'] },
  { id: 'other', label: '其他', asks: ['这件事该不该做？', '现在是做这件事的时机吗？', '眼前的难关过得去吗？', '我的决定是对的吗？', '接下来该往哪个方向走？', '该相信自己的直觉吗？', '这一年的运势怎么样？', '该不该换个地方重新开始？', '这件事要不要告诉别人？', '心里的结什么时候解得开？', '该坚持还是放弃？', '我现在最该留意什么？', '有没有贵人会帮我？', '这个选择以后会后悔吗？', '要不要再给自己一次机会？'] },
];
export const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? '其他';

export interface Profile {
  nickname: string;
  birth: Birth;
}

/** 家人：另外存的几份资料，切换后替他们看运势、求签。自己的那一份仍是 Profile。 */
export interface Person extends Profile {
  id: string;
}
/** 现在看的是谁：'self' 为自己，否则是某位家人的 id。 */
export const SELF = 'self';

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
  /** 替家人求的签：记下当时的称呼；自己求的不记。 */
  who?: string;
  /** 回看的日子（YYYY-MM-DD）：到了这天，首页提醒回来标记有没有应验。 */
  reviewAt?: string;
  /** 起卦的记录：kind 为 'gua'，cast 为六次掷钱的得数（6–9，初爻到上爻）；这时 qianNo 为 0、qianGz 与 grade 为空。 */
  kind?: 'gua';
  cast?: number[];
}

const K = {
  profile: 'jryq.profile.v1',
  settings: 'jryq.settings.v1',
  journal: 'jryq.journal.v1',
  people: 'jryq.people.v1',
  active: 'jryq.active.v1',
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
export const loadPeople = () => read<Person[]>(K.people, []);
export const savePeople = (p: Person[]) => write(K.people, p);
export const loadActive = () => read<string>(K.active, SELF);
export const saveActive = (id: string) => write(K.active, id);

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
  people?: Person[];
}

export function makeBackup(): Backup {
  return {
    app: 'jinri-yiqian',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: loadProfile(),
    settings: loadSettings(),
    journal: loadJournal(),
    people: loadPeople(),
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
