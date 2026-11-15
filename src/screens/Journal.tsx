import { useState } from 'preact/hooks';
import { QianView } from '../components/QianView';
import { Footer, GradeSeal, Icon, Modal, ScreenHeader } from '../components/ui';
import { cnNumber, getQian } from '../lib/qian';
import { type JournalEntry, type Outcome, categoryLabel } from '../lib/storage';

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: 'pending', label: '未定' },
  { id: 'yes', label: '应验' },
  { id: 'no', label: '未应验' },
];

type View = 'book' | 'rack';

interface Props {
  journal: JournalEntry[];
  /** book＝带走的签；rack＝系在签架上的凶签。 */
  view: View;
  onView: (v: View) => void;
  onUpdate: (id: string, patch: Partial<JournalEntry>) => void;
  onDelete: (id: string) => void;
  onDraw: () => void;
}

export function Journal({ journal, view, onView, onUpdate, onDelete, onDraw }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState<string | null>(null);
  const sorted = [...journal].sort((a, b) => b.ts - a.ts);
  const list = sorted.filter((e) => !e.tied);
  const tied = sorted.filter((e) => e.tied);
  const yes = list.filter((j) => j.outcome === 'yes').length;
  const no = list.filter((j) => j.outcome === 'no').length;

  return (
    <section class="screen-body">
      <ScreenHeader
        title={view === 'book' ? '签本' : '签架'}
        sub={
          view === 'rack'
            ? '系在这里的凶签，不带回去'
            : list.length
              ? `${list.length} 签・应验 ${yes}・未应验 ${no}`
              : '求到的签都记在这里'
        }
      />

      <div class="seg two" role="tablist" aria-label="签本与签架">
        <button role="tab" aria-selected={view === 'book'} class={`seg-btn ${view === 'book' ? 'on' : ''}`} onClick={() => onView('book')}>
          签本
        </button>
        <button role="tab" aria-selected={view === 'rack'} class={`seg-btn ${view === 'rack' ? 'on' : ''}`} onClick={() => onView('rack')}>
          签架{tied.length ? `　${tied.length}` : ''}
        </button>
      </div>

      {view === 'rack' && (
        <Rack
          list={tied}
          onUntie={(id) => onUpdate(id, { tied: false })}
          onDelete={onDelete}
        />
      )}

      {view === 'book' && list.length === 0 && (
        <div class="card empty">
          <p>还没有求过签</p>
          <button class="btn primary" onClick={onDraw}>去求第一支签</button>
        </div>
      )}

      {view === 'book' && list.map((e) => {
        const expanded = open === e.id;
        const time = new Date(e.ts);
        return (
          <article class="card entry" key={e.id}>
            <header class="entry-head">
              <div>
                <p class="entry-date">
                  {e.solarText} {String(time.getHours()).padStart(2, '0')}:{String(time.getMinutes()).padStart(2, '0')}
                </p>
                <p class="entry-sub">农历{e.lunarText}・{e.dayGz}日</p>
              </div>
              <GradeSeal grade={e.grade} size="sm" />
            </header>
            <p class="entry-q">
              <span class="tag">{categoryLabel(e.category)}</span>
              {e.question || <span class="muted">心中默念</span>}
            </p>
            <button class="entry-qian" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : e.id)}>
              <b>第{cnNumber(e.qianNo)}签</b>　{e.qianGz}
              <span class="muted">{expanded ? '收起' : '看签诗'}</span>
              <Icon name="chevron" size={18} />
            </button>
            {expanded && <QianView qian={getQian(e.qianNo)} category={e.category} compact />}

            <div class="seg" role="radiogroup" aria-label="是否应验">
              {OUTCOMES.map((o) => (
                <button
                  key={o.id}
                  role="radio"
                  aria-checked={e.outcome === o.id}
                  class={`seg-btn ${o.id} ${e.outcome === o.id ? 'on' : ''}`}
                  onClick={() => onUpdate(e.id, { outcome: o.id })}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <NoteField value={e.note} onSave={(note) => onUpdate(e.id, { note })} />
            <div class="entry-foot">
              {askDelete === e.id ? (
                <div class="confirm-inline" role="group" aria-label="确认删除">
                  <span>删除这笔纪录？</span>
                  <button class="link" onClick={() => setAskDelete(null)}>取消</button>
                  <button class="link danger strong" onClick={() => { onDelete(e.id); setAskDelete(null); }}>
                    确定删除
                  </button>
                </div>
              ) : (
                <button class="link danger" onClick={() => setAskDelete(e.id)}>
                  <Icon name="trash" size={16} /> 删除
                </button>
              )}
            </div>
          </article>
        );
      })}

      <Footer />
    </section>
  );
}

const PER_ROW = 5;

/** 签架：一条条绳上系着折起的凶签。点一张可以打开来看，也可以取下收回签本。 */
function Rack(props: { list: JournalEntry[]; onUntie: (id: string) => void; onDelete: (id: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const rows: JournalEntry[][] = [];
  for (let i = 0; i < props.list.length; i += PER_ROW) rows.push(props.list.slice(i, i + PER_ROW));
  const cur = props.list.find((e) => e.id === openId) ?? null;
  const close = () => {
    setOpenId(null);
    setAskDelete(false);
  };

  // 对话框要直接放在页面这一层（与 .rack 并列）：外层区块有进场动画，包在里面会被当成定位的基准而跑版
  return (
    <>
    <div class="rack">
      {rows.length === 0 && (
        <>
          <div class="rack-row" />
          <p class="aside">签架上还没有签</p>
        </>
      )}
      {rows.map((row, i) => (
        <div class="rack-row" key={i}>
          {row.map((e) => (
            <button key={e.id} class="rack-knot" aria-label={`${e.solarText}系上的第${cnNumber(e.qianNo)}签`} onClick={() => setOpenId(e.id)}>
              <svg viewBox="-16 12 32 64" aria-hidden="true">
                <path d="M-4 30 -11 66 -2 61 0 30Z" />
                <path d="M4 30 10 72 2 64 0 30Z" />
                <rect x="-7" y="18" width="14" height="13" rx="2" />
              </svg>
            </button>
          ))}
        </div>
      ))}
    </div>

      <Modal open={cur !== null} onClose={close} title={cur ? `第${cnNumber(cur.qianNo)}签　${cur.qianGz}` : ''}>
        {cur && (
          <>
            <p class="entry-sub">{cur.solarText}・农历{cur.lunarText}</p>
            <p class="entry-q">
              <span class="tag">{categoryLabel(cur.category)}</span>
              {cur.question || <span class="muted">心中默念</span>}
            </p>
            <QianView qian={getQian(cur.qianNo)} category={cur.category} compact />
            <div class="actions">
              <button class="btn ghost big" onClick={() => { props.onUntie(cur.id); close(); }}>
                取下，收进签本
              </button>
              {askDelete ? (
                <div class="confirm-inline center" role="group" aria-label="确认移除">
                  <span>从签架上移除？</span>
                  <button class="link" onClick={() => setAskDelete(false)}>取消</button>
                  <button class="link danger strong" onClick={() => { props.onDelete(cur.id); close(); }}>
                    确定移除
                  </button>
                </div>
              ) : (
                <button class="btn quiet big" onClick={() => setAskDelete(true)}>移除</button>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function NoteField(props: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(props.value);
  const [saved, setSaved] = useState(false);
  const dirty = v !== props.value;
  return (
    <label class="field note">
      <span>备注</span>
      <textarea
        rows={2}
        maxLength={500}
        value={v}
        placeholder="后来怎么样了"
        onInput={(e) => { setV((e.target as HTMLTextAreaElement).value); setSaved(false); }}
        onBlur={() => { if (dirty) { props.onSave(v); setSaved(true); } }}
      />
      {saved && <small class="hint">已保存</small>}
    </label>
  );
}
