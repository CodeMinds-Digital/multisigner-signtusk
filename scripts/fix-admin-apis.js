const fs = require('fs');
const path = require('path');

// Fix all admin API files to use getAdminSupabaseInstance()
const files = [
  'src/app/api/admin/features/route.ts'
];

files.forEach(filePath => {
  console.log(`Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace patterns where supabase is used without getAdminSupabaseInstance()
  // Look for patterns like "await supabase" or "const { data } = await supabase"
  
  // Pattern 1: await supabase.from
  content = content.replace(
    /(\s+)(const\s+{\s*[^}]+\s*}\s*=\s*)?await\s+supabase\s*\n\s*\.from/g,
    '$1const adminSupabase = getAdminSupabaseInstance()\n$1$2await adminSupabase\n      .from'
  );
  
  // Pattern 2: = await supabase.from
  content = content.replace(
    /(\s+)(const\s+{\s*[^}]+\s*}\s*=\s*)await\s+supabase\.from/g,
    '$1const adminSupabase = getAdminSupabaseInstance()\n$1$2await adminSupabase.from'
  );
  
  // Remove duplicate adminSupabase declarations
  content = content.replace(
    /(const adminSupabase = getAdminSupabaseInstance\(\)\s*\n\s*)+/g,
    'const adminSupabase = getAdminSupabaseInstance()\n    '
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${filePath}`);
});

console.log('All admin API files fixed!');
