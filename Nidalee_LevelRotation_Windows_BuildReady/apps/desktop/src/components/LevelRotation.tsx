import React, { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Account } from '../types';

type Summoner = { display_name: string; level: number };
type State = '空闲' | '启动中' | '监测中' | '切换中' | '完成' | '已停止' | '错误';
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export const LevelRotation: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [target, setTarget] = useState<number>(30);
  const [pollSeconds, setPollSeconds] = useState<number>(15);
  const [state, setState] = useState<State>('空闲');
  const [active, setActive] = useState('');
  const [info, setInfo] = useState<Summoner | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const stop = useRef(false);
  const running = useRef(false);

  useEffect(() => {
    invoke<Account[]>('get_accounts').then(all => setAccounts(all.filter(a => a.game_type === 'league')))
      .catch(e => log(`无法读取账号: ${e}`));
    return () => { stop.current = true; };
  }, []);
  const log = (message: string) => setLogs(old => [`${new Date().toLocaleTimeString()} ${message}`, ...old].slice(0, 200));

  const start = async () => {
    if (running.current || chosen.length === 0) return;
    if (!Number.isInteger(target) || target < 1 || !Number.isFinite(pollSeconds) || pollSeconds < 5) {
      alert('目标等级须为正整数，检查间隔至少为5秒'); return;
    }
    const queue = chosen.map(id => accounts.find(a => a.id === id)).filter((a): a is Account => !!a);
    stop.current = false; running.current = true;
    setInfo(null);
    try {
      for (let i = 0; i < queue.length && !stop.current; i++) {
        const account = queue[i];
        setActive(account.name); setState('启动中');
        log(`启动 ${i+1}/${queue.length}: ${account.name}`);
        await invoke('launch_game', { account, selectedGame: 'league' });
        if (stop.current) break;
        setState('监测中');
        // Repeatedly query authenticated local League Client API. Network/errors never imply target reached.
        let failures = 0;
        while (!stop.current) {
          try {
            const summoner = await invoke<Summoner>('read_summoner_level');
            failures = 0; setInfo(summoner);
            log(`${account.name}: ${summoner.display_name} 等级 ${summoner.level} / ${target}`);
            if (summoner.level >= target) {
              log(`${account.name} 达到目标等级`);
              break;
            }
          } catch (err) {
            failures++;
            log(`读取等级失败(${failures}): ${err}`);
            if (failures >= 20) throw new Error('连续20次无法读取等级，已停止切换以避免误操作');
          }
          const cycles = Math.max(1, Math.ceil(pollSeconds));
          for (let j = 0; j < cycles && !stop.current; j++) await sleep(1000);
        }
        if (stop.current) break;
        if (await invoke<boolean>('is_league_match_running')) {
          throw new Error('检测到正在进行中的对局，为避免中断，未自动退出或切换');
        }
        setState('切换中');
        // Existing Nidalee command closes League and Riot clients; next login starts fresh.
        await invoke('force_close_game', { gameType: 'league' });
        await sleep(3000);
      }
      setState(stop.current ? '已停止' : '完成');
      log(stop.current ? '用户停止：不再自动操作账号' : '所有选中账号达到目标等级');
    } catch (err) {
      setState('错误'); log(`自动流程已停止：${String(err)}`);
    } finally { running.current = false; }
  };

  return <div className="space-y-4 max-w-2xl mx-auto text-gray-200">
    <h2 className="text-xl font-semibold text-bl-red">英雄联盟等级监测与账号轮换</h2>
    <p className="text-xs text-gray-400">使用 Nidalee 原有登录功能及本地 League Client API；不会自动进行游戏对局或升级。</p>
    <div className="space-y-2">
      <p className="text-sm">按顺序选择账号（所选顺序即登录顺序）</p>
      {accounts.length === 0 && <p className="text-gray-400 text-sm">尚未找到英雄联盟账号。请先在 Add Account 添加。</p>}
      {accounts.map(a => <label key={a.id} className="flex items-center gap-2 bg-bl-gray rounded p-2 cursor-pointer">
        <input type="checkbox" checked={chosen.includes(a.id)} disabled={running.current}
          onChange={e => setChosen(old => e.target.checked ? [...old, a.id] : old.filter(id => id !== a.id))}/>
        <span>{a.name}</span><span className="text-xs text-gray-500">{chosen.includes(a.id) ? `#${chosen.indexOf(a.id)+1}` : ''}</span>
      </label>)}
    </div>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm">目标召唤师等级
        <input className="w-full mt-1 bg-bl-gray border border-bl-light-gray rounded p-2" type="number" min="1" step="1" value={target} onChange={e=>setTarget(Number(e.target.value))}/>
      </label>
      <label className="text-sm">检查间隔（秒）
        <input className="w-full mt-1 bg-bl-gray border border-bl-light-gray rounded p-2" type="number" min="5" step="1" value={pollSeconds} onChange={e=>setPollSeconds(Number(e.target.value))}/>
      </label>
    </div>
    <div className="flex gap-2">
      <button className="flex-1 rounded bg-bl-red text-white p-2 disabled:opacity-50" disabled={running.current || chosen.length===0} onClick={start}>开始自动登录/监测</button>
      <button className="rounded bg-bl-gray border border-bl-light-gray px-4 disabled:opacity-50" disabled={!running.current} onClick={() => { stop.current = true; log('收到停止请求'); }}>停止</button>
      <button className="rounded bg-bl-gray border border-bl-light-gray px-4" onClick={async()=>{
        try { const s=await invoke<Summoner>('read_summoner_level'); setInfo(s); log(`手动检查: ${s.display_name}, Lv.${s.level}`); }
        catch(e){log(`检查失败: ${e}`)}
      }}>读取当前等级</button>
    </div>
    <div className="bg-bl-gray rounded p-3 text-sm"><p>状态：{state}　当前账号：{active || '无'}</p>
      <p className="mt-1">客户端等级：{info ? `${info.display_name} / Lv.${info.level}` : '尚未读取'}</p></div>
    <div className="bg-black bg-opacity-30 border border-bl-light-gray rounded p-3 h-48 overflow-y-auto font-mono text-xs whitespace-pre-wrap">{logs.join('\n')}</div>
    <p className="text-xs text-yellow-500">注意：达到等级后会调用 Nidalee 现有强制关闭客户端功能，可能中断正在运行的对局。请仅在客户端大厅、非对局状态使用。客户端更新、验证码或二次验证仍可能需要人工处理；使用前请确认符合游戏服务条款。</p>
  </div>;
};
