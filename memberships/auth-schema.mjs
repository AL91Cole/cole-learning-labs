// Offline schema generation/verification only. Never imported by the Worker.
import { DatabaseSync } from 'node:sqlite';
import { getMigrations } from 'better-auth/db/migration';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { membershipAuthOptions } from './auth.js';

/** D1-shaped local fixture exercises Better Auth's actual D1 adapter without a
 * remote database, OAuth identity, card, email delivery, or network request. */
export function createLocalAuthDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  const binding = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      function selected(values = []) {
        return {
          bind(...next) { return selected(next); },
          async all() {
            const results = statement.all(...values);
            const { changed } = sqlite.prepare('SELECT changes() AS changed').get();
            const { rowId } = sqlite.prepare('SELECT last_insert_rowid() AS rowId').get();
            return { success: true, results, meta: { changes: changed, last_row_id: rowId } };
          },
          async first(column) { const row = statement.get(...values); return column ? row?.[column] ?? null : row ?? null; },
          async run() { const result = statement.run(...values); return { success: true, results: [], meta: { changes: result.changes, last_row_id: result.lastInsertRowid } }; }
        };
      }
      return selected();
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = []; for (const statement of statements) results.push(await statement.all()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    async exec(sql) { sqlite.exec(sql); return { count: 1, duration: 0 }; }
  };
  return { sqlite, binding, close() { sqlite.close(); } };
}

export function fictionalAuthEnvironment(binding) {
  return {
    MEMBERSHIP_DB: binding,
    MEMBERSHIP_ALLOWED_EMAILS: 'teacher@example.test',
    MEMBERSHIP_AUTH_SECRET: 'Fictional-Offline-Auth-Only-Secret-2026-10-31',
    MEMBERSHIP_GOOGLE_CLIENT_ID: '123-fictional.apps.googleusercontent.com',
    MEMBERSHIP_GOOGLE_CLIENT_SECRET: 'Fictional-Offline-Google-Secret'
  };
}

export async function generateAuthSchema() {
  const database = createLocalAuthDatabase();
  try {
    const migrations = await getMigrations(membershipAuthOptions(fictionalAuthEnvironment(database.binding)));
    let sql = await migrations.compileMigrations();
    // Independent storage constraints retain no IP/user-agent/avatar/OAuth-token
    // values even if a future hook accidentally stops minimizing them.
    for (const field of ['image', 'ipAddress', 'userAgent', 'accessToken', 'refreshToken', 'idToken', 'scope', 'password']) {
      sql = sql.replaceAll('"' + field + '" text', '"' + field + '" text CHECK ("' + field + '" IS NULL)');
    }
    sql = sql.replace('"name" text not null', '"name" text not null CHECK ("name" = \'Teacher member\')');
    sql = sql.replace('"emailVerified" integer not null', '"emailVerified" integer not null CHECK ("emailVerified" = 1)');
    sql = sql.replace('"providerId" text not null', '"providerId" text not null CHECK ("providerId" = \'google\')');
    sql += '\n\ncreate unique index "membership_auth_account_provider_subject" on "membership_auth_account" ("providerId", "accountId");';
    return '-- Generated offline from pinned Better Auth; adult authentication only.\n' +
      '-- Apply only to a separately reviewed MEMBERSHIP_DB, never the AI budget or student storage.\n' + sql + '\n';
  } finally { database.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || process.argv[2] !== '--write') throw new Error('Use --write to regenerate the local auth schema.');
  await writeFile(new URL('./auth-schema.sql', import.meta.url), await generateAuthSchema());
}
