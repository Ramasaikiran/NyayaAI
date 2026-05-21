const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase;

if (!supabaseUrl || !supabaseKey) {
  console.warn("WARNING: SUPABASE_URL or SUPABASE_SERVICE_KEY is not defined in environment variables.");
  
  // Create a proxy/dummy that throws a clear error when invoked, instead of crashing at import
  supabase = new Proxy({}, {
    get: function(target, prop) {
      return function() {
        throw new Error(`Supabase client is not fully configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your environment/Vercel settings.`);
      };
    }
  });
} else {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

module.exports = supabase;
