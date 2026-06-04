import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';
import { convertDatabaseReplayToSavedReplay } from '@/utils/dataTransformers';

const OUTPUT_DIR = 'replays';

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    process.stderr.write(
      'missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.\n' +
        'run via `pnpm replay:download` so .env.local is loaded.\n'
    );
    process.exit(1);
  }

  // No auth/session persistence: this is a one-shot read-only script.
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function downloadReplay(
  supabase: ReturnType<typeof getSupabaseClient>,
  id: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('replays')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    process.stderr.write(`✗ ${id}: ${error.message}\n`);
    return false;
  }
  if (!data) {
    process.stderr.write(`✗ ${id}: not found\n`);
    return false;
  }

  const saved = convertDatabaseReplayToSavedReplay(data);
  const path = join(OUTPUT_DIR, `${id}.json`);
  writeFileSync(path, `${JSON.stringify(saved.data, null, 2)}\n`);
  process.stdout.write(`✓ ${id} → ${path}\n`);
  return true;
}

async function main(): Promise<void> {
  const ids = process.argv.slice(2);
  if (ids.length === 0 || ids[0] === '--help' || ids[0] === '-h') {
    process.stderr.write('usage: pnpm replay:download <id> [<id> ...]\n');
    process.exit(ids.length === 0 ? 2 : 0);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const supabase = getSupabaseClient();
  const results = await Promise.all(
    ids.map(id => downloadReplay(supabase, id))
  );

  const failed = results.filter(ok => !ok).length;
  process.stdout.write(
    `\ndone: ${results.length - failed}/${results.length} downloaded\n`
  );
  process.exit(failed > 0 ? 1 : 0);
}

main();
