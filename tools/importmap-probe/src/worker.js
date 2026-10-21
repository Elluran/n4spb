// import maps are not applied inside workers (the engine's only worker, core/baked-worker.js, imports nothing area-specific): this records what a worker sees
import { AREA } from './data/city.js';
postMessage({ city: AREA });
