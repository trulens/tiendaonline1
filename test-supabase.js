const fs = require('fs');
const path = require('path');
const ENV_FILE = path.join(process.cwd(), 'nextjs-app', '.env.local');

let SUPABASE_URL = '';
let SUPABASE_KEY = '';

try {
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SUPABASE_KEY = line.split('=')[1].trim();
  });
} catch (e) {
  console.log("Asegúrate de configurar nextjs-app/.env.local");
}

async function supabaseRequest(endpoint, options = {}) {
  const url = new URL(`/rest/v1/${endpoint}`, SUPABASE_URL);
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'POST' || options.method === 'PATCH' ? 'return=representation' : '',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Error en Supabase');
  return data;
}

async function test() {
  const u = '12345678';
  const p = '1234';
  try {
    const users = await supabaseRequest(`usuarios?select=*&dni=eq.${u}&pin=eq.${p}&limit=1`);
    console.log("USERS:", users);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

test();
