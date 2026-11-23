import { useState } from 'preact/hooks';
import { CardSheet } from '../components/CardSheet';
import { DivineView } from '../components/DivineView';
import { QianView } from '../components/QianView';
import { GradeSeal, Icon, Modal, ScreenHeader } from '../components/ui';
import { renderQianCard } from '../lib/card';
import { cnNumber, getQian } from '../lib/qian';
import { type LineValue, divine } from '../lib/divine';
import { entryName, journalStats } from '../lib/review';
import { type JournalEntry, type Outcome, categoryLabel } from '../lib/storage';

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: 'pending', label: '未定' },
  { id: 'yes', label: '应验' },
  { id: 'no', label: '未应验' },
];

type View = 'book' | 'rack';

interface Props {
  journal: JournalEntry[];
  /** 自己的称呼：做卡片时写在页尾（替家人求的签写家人的称呼）。 */
  nickname: string;
  /** book＝带走的签；rack＝系在签架上的凶签。 */
  view: View;
  onView: (v: View) => void;
  onUpdate: (id: string, patch: Partial<JournalEntry>) => void;
  onDelete: (id: string) => void;
  onDraw: () => void;
}

export function Journal({ journal, nickname, view, onView, onUpdate, onDelete, onDraw }: Props) {
  const [cardFor, setCardFor] = useState<JournalEntry | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState<string | null>(null);
  const sorted = [...journal].sort((a, b) => b.ts - a.ts);
  const list = sorted.filter((e) => !e.tied);
  const tied = sorted.filter((e) => e.tied && e.kind !== 'gua');
  const stats = journalStats(journal);

  return (
    <section class="screen-body">
      <ScreenHeader
        title={view === 'book' ? '签本' : '签架'}
        sub={
          view === 'rack'
            ? '系在这里的凶签，不带回去'
            : list.length
              ? `${list.length} 签`
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

      {/* 累积多了才显示：已标记的签里应验占多少、最常问哪几类 */}
      {view === 'book' && (stats.rate !== null || stats.total >= 3) && (
        <dl class="stats">
          {stats.rate !== null && (
            <div>
              <dt>应验</dt>
              <dd>
                {stats.yes + stats.no} 支有了结果，{stats.yes} 支应验，占 {stats.rate}%
              </dd>
            </div>
          )}
          {stats.total >= 3 && (
            <div>
              <dt>常问</dt>
              <dd>{stats.top.map((t) => `${categoryLabel(t.id)} ${t.n}`).join('・')}</dd>
            </div>
          )}
        </dl>
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
                <p class="entry-sub">
                  农历{e.lunarText}・{e.dayGz}日
                  {e.outcome === 'pending' && e.reviewAt && `・${Number(e.reviewAt.slice(5, 7))}月${Number(e.reviewAt.slice(8))}日回看`}
                </p>
              </div>
              {e.kind === 'gua' ? <span class="grade-seal sm mid">卦</span> : <GradeSeal grade={e.grade} size="sm" />}
            </header>
            <p class="entry-q">
              {e.who && <span class="tag who-tag">{e.who}</span>}
              <span class="tag">{categoryLabel(e.category)}</span>
              {e.question || <span class="muted">心中默念</span>}
            </p>
            <button class="entry-qian" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : e.id)}>
              <b>{entryName(e)}</b>
              {e.kind !== 'gua' && `　${e.qianGz}`}
              <span class="muted">{expanded ? '收起' : e.kind === 'gua' ? '看卦' : '看签诗'}</span>
              <Icon name="chevron" size={18} />
            </button>
            {expanded &&
              (e.kind === 'gua' && e.cast ? (
                <DivineView d={divine(e.cast as LineValue[])} category={e.category} question={e.question} compact />
              ) : (
                <QianView qian={getQian(e.qianNo)} category={e.category} compact />
              ))}

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
                <>
                  {e.kind !== 'gua' && (
                    <button class="link" onClick={() => setCardFor(e)}>
                      <Icon name="image" size={16} /> 签诗卡片
                    </button>
                  )}
                  <button class="link danger" onClick={() => setAskDelete(e.id)}>
                    <Icon name="trash" size={16} /> 删除
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}

      <CardSheet
        open={cardFor !== null}
        onClose={() => setCardFor(null)}
        title="签诗卡片"
        filename={cardFor ? `清吉-第${cardFor.qianNo}签.png` : '清吉.png'}
        render={() => renderQianCard({ qian: getQian(cardFor!.qianNo), category: cardFor!.category, name: cardFor!.who ?? nickname, dateText: cardFor!.solarText })}
      />
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
              {cur.who && <span class="tag who-tag">{cur.who}</span>}
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
