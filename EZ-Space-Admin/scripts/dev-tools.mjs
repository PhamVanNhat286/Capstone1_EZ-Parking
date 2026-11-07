import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// No dependency needed. A secret can be set in a local, gitignored .env.local.
export function loadEnv() {
  const env = {...process.env};
  const path = join(root,'.env.local');
  if (existsSync(path)) {
    for (const line of readFileSync(path,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/)) {
      const m = line.match(/^\s*((?:EZ_DB_(?:HOST|PORT|NAME|USER|PASS)|EZ_HTTP_PORT))=(.*)$/);
      if (!m) continue;
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1,-1);
      env[m[1]]=value;
    }
  }
  env.EZ_DB_HOST ??= '127.0.0.1';
  env.EZ_DB_PORT ??= '3307';
  env.EZ_DB_NAME ??= 'ez_space';
  env.EZ_DB_USER ??= 'root';
  env.EZ_DB_PASS ??= '';
  if (env.EZ_DB_HOST !== '127.0.0.1' && env.EZ_DB_HOST !== 'localhost') throw new Error('Ban local chi cho phep MySQL tren may anh. Sua EZ_DB_HOST=127.0.0.1.');
  if (!/^\d{1,5}$/.test(env.EZ_DB_PORT)) throw new Error('EZ_DB_PORT khong hop le.');
  if (env.EZ_DB_NAME !== 'ez_space') throw new Error('Database can dung ten ez_space.');
  return env;
}

export function phpPath() {
  const options = process.platform==='win32' ? ['C:\\xampp\\php\\php.exe','php.exe'] : ['php'];
  for (const candidate of options) {
    if (candidate==='php' || candidate==='php.exe') {
      const found=spawnSync(candidate,['-v'],{stdio:'ignore',shell:process.platform==='win32'});
      if (!found.error && found.status===0) return candidate;
    } else if (existsSync(candidate)) return candidate;
  }
  throw new Error('Khong tim thay PHP. Cai PHP hoac giu XAMPP de lay php.exe (app KHONG can nam trong htdocs).');
}

export function checkDatabase(php,env) {
  console.log('Kiem tra MySQL that:',env.EZ_DB_NAME,'tren',env.EZ_DB_HOST+':'+env.EZ_DB_PORT);
  const r=spawnSync(php,[join(root,'scripts','check-db.php')],{cwd:root,env,encoding:'utf8',shell:process.platform==='win32' && php==='php.exe'});
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.error || r.status!==0) throw new Error('Kiem tra database that bai. App khong khoi dong voi du lieu gia.');
}

export function runDev(php,env) {
  const port = Number(env.EZ_HTTP_PORT || 8000);
  if (!Number.isInteger(port) || port<1024 || port>65535) throw new Error('EZ_HTTP_PORT khong hop le.');
  const url=`http://127.0.0.1:${port}/`;
  console.log('Dang chay: '+url);
  console.log('Mo link tren bang trinh duyet hoac VS Code Simple Browser. Nhan Ctrl+C de dung.');
  const child = spawn(php,['-S',`127.0.0.1:${port}`,'router.php'],{cwd:root,env,stdio:'inherit',shell:process.platform==='win32' && php==='php.exe'});
  child.on('error', e=>{console.error('PHP server loi:',e.message);process.exitCode=1;});
  child.on('exit',(code)=>{if (code !== 0 && code !== null) process.exitCode=code;});
  for (const sig of ['SIGINT','SIGTERM']) process.on(sig,()=>{if (!child.killed) child.kill(sig);});
}
