import terms from '../data/terms.json';

type Group = 'divine' | 'daily' | 'zeri' | 'qian';

/** “看不懂的词”：一组名词的白话解释，收在一行里，点开才展开。 */
export function Terms(props: { group: Group; title?: string }) {
  const list = terms[props.group] as [string, string][];
  return (
    <details class="qian-more terms">
      <summary>
        <span>{props.title ?? '看不懂的词'}</span>
      </summary>
      <dl class="terms-list">
        {list.map(([t, d]) => (
          <div key={t}>
            <dt>{t}</dt>
            <dd>{d}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
