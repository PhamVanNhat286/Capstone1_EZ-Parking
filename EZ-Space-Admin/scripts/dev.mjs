import {loadEnv,phpPath,checkDatabase,runDev} from './dev-tools.mjs';
try {const env=loadEnv();const php=phpPath();checkDatabase(php,env);runDev(php,env);}
catch(e){console.error('LOI:',e.message);process.exitCode=1;}
