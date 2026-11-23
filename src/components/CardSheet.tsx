import { useEffect, useRef, useState } from 'preact/hooks';
import { canShareFiles, shareImage } from '../lib/card';
import { IS_PREVIEW, saveFile } from '../lib/platform';
import { Icon, Modal } from './ui';

/**
 * 卡片的预览、分享与保存。打开时才绘制；关掉再开会重画（内容可能已换）。
 * 要放在页面的最外层（screen-body 的直接子元素），对话框才不会被进场动画影响定位。
 */
export function CardSheet(props: { open: boolean; onClose: () => void; title: string; filename: string; render: () => Promise<Blob> }) {
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const url = useRef<string | null>(null);

  const replace = (next: { blob: Blob; url: string } | null) => {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = next?.url ?? null;
    setCard(next);
  };

  useEffect(() => {
    if (!props.open) return;
    let alive = true;
    replace(null);
    setErr('');
    setMsg('');
    props
      .render()
      .then((blob) => alive && replace({ blob, url: URL.createObjectURL(blob) }))
      .catch((e) => alive && setErr((e as Error).message || '卡片产生失败'));
    return () => {
      alive = false;
    };
  }, [props.open]);
  useEffect(() => () => replace(null), []);

  const share = async () => {
    if (!card) return;
    const r = await shareImage(card.blob, props.filename);
    setMsg(r === 'downloaded' ? '已下载图片' : '');
  };
  const save = async () => {
    if (!card) return;
    const r = await saveFile(card.blob, props.filename);
    setMsg(r === 'saved' ? '已保存图片' : r === 'declined' ? '' : '这里无法直接保存，请长按上方图片。');
  };

  return (
    <Modal open={props.open} onClose={props.onClose} title={props.title}>
      {err && <p class="err">{err}</p>}
      {!card && !err && <p class="hint center">卡片绘制中…</p>}
      {card && (
        <>
          <img class="card-preview" src={card.url} alt={props.title} />
          <div class="row">
            {canShareFiles() && (
              <button class="btn primary" onClick={share}>
                <Icon name="share" /> 分享
              </button>
            )}
            <button class={`btn ${IS_PREVIEW || !canShareFiles() ? 'primary' : 'ghost'}`} onClick={save}>
              <Icon name="download" /> 保存图片
            </button>
          </div>
          {msg && <p class="hint center">{msg}</p>}
        </>
      )}
    </Modal>
  );
}
