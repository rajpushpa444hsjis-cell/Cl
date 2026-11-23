import { CATEGORIES, type CategoryId, categoryLabel } from '../lib/storage';
import { Icon } from './ui';

export type AskMode = 'qian' | 'gua' | 'date';

/** 问事的三种方式：求签、起卦、择日。求签与起卦只在第一屏出现。 */
export function ModeSwitch(props: { mode: AskMode; onChange: (m: AskMode) => void }) {
  return (
    <div class="seg three mode" role="tablist" aria-label="问事的方式">
      {(
        [
          ['qian', '求签'],
          ['gua', '起卦'],
          ['date', '择日'],
        ] as const
      ).map(([id, label]) => (
        <button key={id} role="tab" aria-selected={props.mode === id} class={`seg-btn ${props.mode === id ? 'on' : ''}`} onClick={() => props.onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * 问事分两屏：先选类别，再选一个现成的问法或自己写。每一屏都不必往下滑。
 * picking 由外层管：外层要知道现在是不是在选类别（那时才显示“求签／起卦”的切换）。
 */
export function AskPicker(props: {
  category: CategoryId | null;
  question: string;
  picking: boolean;
  onCategory: (id: CategoryId) => void;
  onPicking: () => void;
  onQuestion: (q: string) => void;
  onNext: () => void;
}) {
  const { category, question } = props;
  if (props.picking || !category)
    return (
      <div class="card">
        <h2 class="card-title">想问哪一方面？</h2>
        <div class="cat-grid" role="radiogroup" aria-label="问事类别">
          {CATEGORIES.map((c) => (
            <button key={c.id} role="radio" aria-checked={category === c.id} class={`cat ${category === c.id ? 'on' : ''}`} onClick={() => props.onCategory(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
    );
  return (
    <div class="card">
      {/* 标题与“回去换类别”放在同一行，省下一行的高度 */}
      <div class="ask-head">
        <h2 class="card-title">想问什么？</h2>
        <button class="link back" aria-label={`${categoryLabel(category)}，换一个类别`} onClick={props.onPicking}>
          <Icon name="back" size={16} /> {categoryLabel(category)}
        </button>
      </div>
      <div class="ask-list" role="radiogroup" aria-label="现成的问法">
        {(CATEGORIES.find((c) => c.id === category)?.asks ?? []).map((a) => (
          <button key={a} role="radio" aria-checked={question === a} class={`ask ${question === a ? 'on' : ''}`} onClick={() => props.onQuestion(question === a ? '' : a)}>
            {a}
          </button>
        ))}
      </div>
      <label class="field">
        <textarea
          rows={question.length > 17 ? 2 : 1}
          maxLength={100}
          value={question}
          aria-label="想问的事"
          placeholder="也可以自己写，或在心里默念"
          onInput={(e) => props.onQuestion((e.target as HTMLTextAreaElement).value)}
        />
      </label>
      <button class="btn primary big" onClick={props.onNext}>
        下一步
      </button>
    </div>
  );
}

/** 选了类别：换了类别，原先点选的现成问法不再适用，清掉。 */
export function nextQuestion(prev: CategoryId | null, next: CategoryId, question: string): string {
  return next !== prev && CATEGORIES.some((c) => c.asks.includes(question)) ? '' : question;
}
