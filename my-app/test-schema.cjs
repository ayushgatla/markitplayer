const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' }); // or whichever .env it needs

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('comments').select('*').limit(1);
  console.log(data);
  console.log(error);
}
test();
