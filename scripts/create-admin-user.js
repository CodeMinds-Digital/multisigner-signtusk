const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gzxfsojbbfipzvjxucci.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your_service_role_key_here';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user with proper password hashing...');

    // Hash the password
    const password = 'admin123!';
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('✅ Password hashed successfully');

    // Insert admin user
    const { data, error } = await supabase
      .from('admin_users')
      .upsert({
        email: 'admin@signtusk.com',
        password_hash: passwordHash,
        name: 'Super Admin',
        role: 'super_admin',
        is_active: true,
        two_fa_enabled: false
      }, {
        onConflict: 'email'
      })
      .select();

    if (error) {
      console.error('❌ Error creating admin user:', error);
      return;
    }

    console.log('✅ Admin user created successfully:', data);

    // Create additional admin users
    const additionalUsers = [
      {
        email: 'support@signtusk.com',
        password: 'support123!',
        name: 'Support Admin',
        role: 'support'
      },
      {
        email: 'auditor@signtusk.com',
        password: 'auditor123!',
        name: 'System Auditor',
        role: 'auditor'
      }
    ];

    for (const user of additionalUsers) {
      const userPasswordHash = await bcrypt.hash(user.password, 10);
      
      const { data: userData, error: userError } = await supabase
        .from('admin_users')
        .upsert({
          email: user.email,
          password_hash: userPasswordHash,
          name: user.name,
          role: user.role,
          is_active: true,
          two_fa_enabled: false
        }, {
          onConflict: 'email'
        })
        .select();

      if (userError) {
        console.error(`❌ Error creating ${user.role} user:`, userError);
      } else {
        console.log(`✅ ${user.role} user created:`, userData);
      }
    }

    console.log('\n🎉 All admin users created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('Super Admin: admin@signtusk.com / admin123!');
    console.log('Support:     support@signtusk.com / support123!');
    console.log('Auditor:     auditor@signtusk.com / auditor123!');

  } catch (error) {
    console.error('❌ Error in createAdminUser:', error);
  }
}

// Run the script
createAdminUser();
