import { env, ctx, ms, L } from './environment-harness.mjs';
console.log('built ms', ms, 'trees', env.trees.length, JSON.stringify(env.treeStats));
