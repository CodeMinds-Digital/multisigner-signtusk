# 📧 SignTusk Email Testing Suite

This is a standalone Node.js testing suite to verify Resend email configuration for SignTusk.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd email-test-nodejs
npm install
```

### 2. Configure Environment
Edit `.env` file with your settings:
```env
RESEND_API_KEY=your_resend_api_key_here
FROM_DOMAIN=notifications.signtusk.com
TEST_EMAIL_VERIFIED=your_verified_email@gmail.com
TEST_EMAIL_UNVERIFIED=test@example.com
APP_URL=http://localhost:3000
```

### 3. Run Tests

#### Basic Email Configuration Test
```bash
npm test
# or
npm run test
```

#### Signature Request Email Test
```bash
npm run test-signature
```

#### Reminder Email Test
```bash
npm run test-reminder
```

## 📋 Test Scenarios

### Test 1: Basic Configuration
- ✅ Verifies API key is working
- ✅ Tests custom domain (`notifications.signtusk.com`)
- ✅ Tests default Resend domain fallback
- ⚠️ Shows expected failures for unverified recipients

### Test 2: Signature Request Email
- 📝 Sends professional signature request email
- 🎨 Uses SignTusk branding and styling
- 🔗 Includes signature URL with parameters
- 📅 Shows due date and custom message

### Test 3: Reminder Email
- ⏰ Sends urgent reminder email
- 🔴 Uses red theme for urgency
- 📊 Shows reminder count
- ⚡ Emphasizes deadline

## 🔧 Troubleshooting

### Domain Verification Issues
If you see errors like:
```
"The notifications.signtusk.com domain is not verified"
```

**Solution:**
1. Go to [Resend Domains](https://resend.com/domains)
2. Add `notifications.signtusk.com`
3. Configure DNS records as shown
4. Wait for verification (can take up to 24 hours)

### Testing Mode Limitations
If you see:
```
"You can only send testing emails to your own email address"
```

**This is normal!** Resend accounts start in testing mode:
- ✅ Can send to verified email addresses
- ❌ Cannot send to unverified recipients
- 🔄 Upgrade to production mode to send to anyone

### API Key Issues
- Make sure your API key starts with `re_`
- Check it's copied correctly without extra spaces
- Verify it's not expired

## 📊 Expected Results

### ✅ Success Indicators
- Email ID returned (e.g., `re_abc123...`)
- No error messages
- Email received in inbox

### ⚠️ Expected Warnings
- Unverified recipient failures (normal in testing mode)
- Domain verification pending (if domain not verified yet)

### ❌ Failure Indicators
- Invalid API key errors
- Network connection issues
- Malformed email addresses

## 🎯 Next Steps

Once emails are working here:
1. Update your main SignTusk app with the working configuration
2. Use `noreply@notifications.signtusk.com` as the from address
3. Implement the same error handling patterns
4. Consider upgrading Resend to production mode for broader testing

## 📞 Support

If tests continue to fail:
1. Check Resend dashboard for delivery logs
2. Verify domain DNS settings
3. Contact Resend support if domain verification is stuck
4. Review API key permissions and limits
