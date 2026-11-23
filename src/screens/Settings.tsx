import { useRef, useState } from 'preact/hooks';
import { ProfileForm } from '../components/ProfileForm';
import { ScreenHeader } from '../components/ui';
import { canVibrate } from '../lib/haptics';
import { saveFile } from '../lib/platform';
import { computeBazi } from '../lib/lunar';
import { type Backup, type Person, type Profile, type Settings as S, type ThemePref, makeBackup, newId, parseBackup } from '../lib/storage';

interface Props {
  profile: Profile;
  people: Person[];
  onPeople: (list: Person[]) => void;
  settings: S;
  onProfile: (p: Profile) => void;
  onSettings: (s: S) => void;
  onImport: (b: Backup) => void;
  onClear: () => void;
}

export function Settings(props: Props) {
  const { settings: s } = props;
  const [savedMsg, setSavedMsg] = useState('');
  const [dataMsg, setDataMsg] = useState('');
  const [pending, setPending] = useState<Backup | null>(null); // 等待确认的导入
  const [askClear, setAskClear] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // 家人：正在编辑的 id，'new' 为新增
  const [askRemove, setAskRemove] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<S>) => props.onSettings({ ...s, ...patch });

  const exportData = async () => {
    const blob = new Blob([JSON.stringify(makeBackup(), null, 1)], { type: 'application/json' });
    const d = new Date();
    const r = await saveFile(blob, `清吉备份-${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}.json`);
    setDataMsg(r === 'saved' ? '已导出' : r === 'declined' ? '' : '这里存不了文件，请到正式版导出');
  };

  const importData = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      setPending(parseBackup(await f.text()));
      setDataMsg('');
    } catch (err) {
      setDataMsg(`导入失败：${(err as Error).message}`);
    } finally {
      (e.target as HTMLInputElement).value = '';
    }
  };

  return (
    <section class="screen-body">
      <ScreenHeader title="设置" />

      <div class="card">
        <h2 class="card-title">个人资料</h2>
        <ProfileForm
          initial={props.profile}
          submitLabel="保存个人资料"
          onSubmit={(p) => {
            props.onProfile(p);
            setSavedMsg('已保存');
            setTimeout(() => setSavedMsg(''), 2000);
          }}
        />
        {savedMsg && <p class="hint center" role="status">{savedMsg}</p>}
      </div>

      {/* 家人：多存几份资料，在首页右上角切换，替他们看运势、求签 */}
      <div class="card">
        <h2 class="card-title">家人</h2>
        {props.people.length > 0 && (
          <ul class="people">
            {props.people.map((p) => {
              const b = computeBazi(p.birth);
              return (
                <li key={p.id}>
                  {editing === p.id ? (
                    <ProfileForm
                      initial={p}
                      submitLabel="保存"
                      onSubmit={(v) => {
                        props.onPeople(props.people.map((x) => (x.id === p.id ? { ...v, id: p.id } : x)));
                        setEditing(null);
                      }}
                    />
                  ) : (
                    <div class="person">
                      <div>
                        <b>{p.nickname}</b>
                        <span>
                          属{b.shengxiao}・日主{b.dayMaster}{b.element}
                        </span>
                      </div>
                      {askRemove === p.id ? (
                        <div class="confirm-inline" role="group" aria-label="确认删除">
                          <button class="link" onClick={() => setAskRemove(null)}>取消</button>
                          <button
                            class="link danger strong"
                            onClick={() => {
                              props.onPeople(props.people.filter((x) => x.id !== p.id));
                              setAskRemove(null);
                            }}
                          >
                            确定删除
                          </button>
                        </div>
                      ) : (
                        <div class="confirm-inline">
                          <button class="link" onClick={() => { setEditing(p.id); setAskRemove(null); }}>编辑</button>
                          <button class="link danger" onClick={() => setAskRemove(p.id)}>删除</button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {editing === 'new' ? (
          <ProfileForm
            key="new"
            submitLabel="添加"
            onSubmit={(v) => {
              props.onPeople([...props.people, { ...v, id: newId() }]);
              setEditing(null);
            }}
          />
        ) : (
          <button class="btn ghost big" onClick={() => setEditing('new')}>添加家人</button>
        )}
      </div>

      <div class="card">
        <h2 class="card-title">求签</h2>
        <fieldset class="radio-group">
          <legend>取签方式</legend>
          <label>
            <input type="radio" name="cm" checked={s.confirmMode === 1} onChange={() => set({ confirmMode: 1 })} />
            掷筊确认，一个圣筊
          </label>
          <label>
            <input type="radio" name="cm" checked={s.confirmMode === 3} onChange={() => set({ confirmMode: 3 })} />
            掷筊确认，连续三个圣筊
          </label>
          <label>
            <input type="radio" name="cm" checked={s.confirmMode === 0} onChange={() => set({ confirmMode: 0 })} />
            不掷筊，摇到哪支取哪支
          </label>
        </fieldset>
      </div>

      <div class="card">
        <h2 class="card-title">外观与反馈</h2>
        <fieldset class="radio-group inline">
          <legend>深色模式</legend>
          {(['system', 'light', 'dark'] as ThemePref[]).map((t) => (
            <label key={t}>
              <input type="radio" name="theme" checked={s.theme === t} onChange={() => set({ theme: t })} />
              {t === 'system' ? '跟随系统' : t === 'light' ? '浅色' : '深色'}
            </label>
          ))}
        </fieldset>
        <label class="switch">
          <span>音效</span>
          <input type="checkbox" checked={s.sound} onChange={(e) => set({ sound: (e.target as HTMLInputElement).checked })} />
        </label>
        {/* 不支持震动的设备（例如 iPhone）就不显示这个开关 */}
        {canVibrate() && (
          <label class="switch">
            <span>震动反馈</span>
            <input type="checkbox" checked={s.vibrate} onChange={(e) => set({ vibrate: (e.target as HTMLInputElement).checked })} />
          </label>
        )}
      </div>

      <div class="card">
        <h2 class="card-title">数据</h2>
        <p class="hint">资料只存在这部手机里，换手机前记得导出备份。</p>
        <div class="row">
          <button class="btn ghost" onClick={exportData}>导出备份</button>
          <button class="btn ghost" onClick={() => fileRef.current?.click()}>导入备份</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} />
        </div>
        {pending && (
          <div class="confirm-box" role="group" aria-label="确认导入">
            <p>用备份里的 {pending.journal.length} 笔签本替换现在的资料？</p>
            <div class="row">
              <button class="btn ghost" onClick={() => setPending(null)}>取消</button>
              <button
                class="btn primary"
                onClick={() => {
                  props.onImport(pending);
                  setPending(null);
                  setDataMsg('已导入');
                }}
              >
                确定导入
              </button>
            </div>
          </div>
        )}
        {askClear ? (
          <div class="confirm-box danger" role="group" aria-label="确认清除">
            <p>清除全部资料与签本？清掉就找不回来了。</p>
            <div class="row">
              <button class="btn ghost" onClick={() => setAskClear(false)}>取消</button>
              <button class="btn primary" onClick={() => props.onClear()}>确定清除</button>
            </div>
          </div>
        ) : (
          <button class="link danger" onClick={() => setAskClear(true)}>
            清除所有数据
          </button>
        )}
        {dataMsg && <p class="hint" role="status">{dataMsg}</p>}
      </div>

    </section>
  );
}
