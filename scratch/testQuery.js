const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: 'my-app/.env'});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('rooms').select('*, comments(count)').limit(1);
  console.log('Data:', JSON.stringify(data, null, 2));
  if (error) console.log('Error:', error);
}
test();
