const bcrypt = require('bcryptjs');

async function debugAuth() {
  console.log('🔍 Debugging admin authentication...\n');
  
  // Test data
  const email = 'admin@signtusk.com';
  const password = 'admin123!';
  const storedHash = '$2b$10$F.L33R/8JFA6PO9EG4qB.uE5DYCj6ogmKHJyQw0M8HW9UGoFihrTe';
  
  console.log('📧 Email:', email);
  console.log('🔑 Password:', password);
  console.log('🔐 Stored Hash:', storedHash);
  console.log('');
  
  // Test bcrypt comparison
  console.log('🧪 Testing bcrypt.compare...');
  const isValid = await bcrypt.compare(password, storedHash);
  console.log('✅ Password valid:', isValid);
  console.log('');
  
  // Test API call
  console.log('🌐 Testing API call...');
  try {
    const response = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    console.log('📡 API Response Status:', response.status);
    console.log('📄 API Response Body:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
  }
}

debugAuth();
