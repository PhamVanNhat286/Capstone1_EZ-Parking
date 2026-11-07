import {loadEnv,phpPath,checkDatabase} from './dev-tools.mjs';
try {checkDatabase(phpPath(),loadEnv());}catch(e){console.error('LOI:',e.message);process.exitCode=1;}
