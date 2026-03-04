/**
 * db.js — Claude direct DB access helper
 *
 * Run with:
 *   NODE_PATH=/usr/local/lib/node_modules node scripts/db.js <command> [options]
 *
 * Commands:
 *   status          Show counts: companies, jobs by status
 *   new-jobs        List all jobs with status='new'
 *   all-jobs        List all jobs with company names
 *   add-job         Add a job (--company, --title, --url, --salary, --status)
 *   update-job      Update a job (--id, --status, --title, --url, --notes)
 *   add-company     Add a company (--name, --url, --careers, --tier, --tag)
 */

const { Client } = require('pg');

const CONN = 'postgresql://neondb_owner:REDACTED@ep-sweet-bar-aiaksyfs.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Parse --key=value or --key value args
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const [key, ...rest] = argv[i].slice(2).split('=');
      args[key] = rest.length ? rest.join('=') : argv[i + 1] || true;
    }
  }
  return args;
}

async function run() {
  const [,, command, ...rest] = process.argv;
  const args = parseArgs(rest);
  const client = new Client({ connectionString: CONN });

  await client.connect();

  try {
    switch (command) {

      case 'status': {
        const { rows: [c] } = await client.query('SELECT COUNT(*) FROM companies');
        const { rows } = await client.query(`
          SELECT status, COUNT(*) as count FROM jobs GROUP BY status ORDER BY status
        `);
        console.log(`Companies: ${c.count}`);
        console.log('Jobs by status:');
        rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));
        break;
      }

      case 'new-jobs': {
        const { rows } = await client.query(`
          SELECT j.id, c.name as company, j.title, j.url, j.salary_range, j.created_at
          FROM jobs j
          JOIN companies c ON c.id = j.company_id
          WHERE j.status = 'new'
          ORDER BY j.created_at DESC
        `);
        if (!rows.length) {
          console.log('No new jobs.');
        } else {
          console.log(`${rows.length} new job(s):\n`);
          rows.forEach(r => {
            console.log(`[${r.id}] ${r.company} — ${r.title || 'Untitled'}`);
            if (r.url)          console.log(`     URL: ${r.url}`);
            if (r.salary_range) console.log(`     Salary: ${r.salary_range}`);
            console.log(`     Added: ${new Date(r.created_at).toLocaleDateString()}`);
            console.log('');
          });
        }
        break;
      }

      case 'all-jobs': {
        const { rows } = await client.query(`
          SELECT j.id, c.name as company, j.title, j.url, j.salary_range, j.status, j.date_applied
          FROM jobs j
          JOIN companies c ON c.id = j.company_id
          ORDER BY j.created_at DESC
        `);
        console.log(`${rows.length} total job(s):\n`);
        rows.forEach(r => {
          console.log(`[${r.id}] ${r.company} — ${r.title || 'Untitled'} (${r.status})`);
          if (r.url)          console.log(`     URL: ${r.url}`);
          if (r.salary_range) console.log(`     Salary: ${r.salary_range}`);
          if (r.date_applied) console.log(`     Applied: ${r.date_applied}`);
          console.log('');
        });
        break;
      }

      case 'add-job': {
        if (!args.company) throw new Error('--company required');
        const { rows: companies } = await client.query(
          `SELECT id FROM companies WHERE LOWER(name) = LOWER($1)`,
          [args.company]
        );
        if (!companies.length) throw new Error(`Company not found: ${args.company}`);
        const company_id = companies[0].id;
        const { rows: [job] } = await client.query(`
          INSERT INTO jobs (company_id, title, url, salary_range, status, date_applied)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          company_id,
          args.title || '',
          args.url || null,
          args.salary || null,
          args.status || 'new',
          args.date || new Date().toISOString().split('T')[0],
        ]);
        console.log(`Added job [${job.id}]: ${args.company} — ${job.title || 'Untitled'}`);
        break;
      }

      case 'update-job': {
        if (!args.id) throw new Error('--id required');
        const { rows: [job] } = await client.query(`
          UPDATE jobs SET
            status     = COALESCE($2, status),
            title      = COALESCE($3, title),
            url        = COALESCE($4, url),
            notes      = COALESCE($5, notes),
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `, [
          args.id,
          args.status || null,
          args.title  || null,
          args.url    || null,
          args.notes  || null,
        ]);
        if (!job) throw new Error(`Job ${args.id} not found`);
        console.log(`Updated job [${job.id}]: status=${job.status}`);
        break;
      }

      case 'add-company': {
        if (!args.name) throw new Error('--name required');
        const { rows: [company] } = await client.query(`
          INSERT INTO companies (name, url, careers_url, tier, tag, sort_order)
          VALUES ($1, $2, $3, $4, $5, 999)
          RETURNING *
        `, [
          args.name,
          args.url     || null,
          args.careers || null,
          args.tier    || 3,
          args.tag     || null,
        ]);
        console.log(`Added company [${company.id}]: ${company.name} (tier ${company.tier})`);
        break;
      }

      default:
        console.log('Commands: status | new-jobs | all-jobs | add-job | update-job | add-company');
    }
  } finally {
    await client.end();
  }
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
