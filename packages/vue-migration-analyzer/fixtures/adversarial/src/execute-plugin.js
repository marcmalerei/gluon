import { writeFileSync } from 'node:fs';
writeFileSync(new URL('../sentinel-created', import.meta.url), 'executed');
