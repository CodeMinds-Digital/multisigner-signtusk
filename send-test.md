🎯 STEP-BY-STEP TESTING GUIDE
🔧 PREPARATION
Upload Page Ready: ✅ http://localhost:3001/send/upload
Server Running: ✅ Port 3001
Auto-Email Fixed: ✅ Ready for testing
Database Schema: ✅ All fields mapped correctly
📋 TEST EXECUTION PLAN
🟢 TEST 1: BASIC LINK (START HERE)
Creator Steps:

Go to http://localhost:3001/send/upload
Upload any PDF document
Click "Create Share Link"
Basic Tab Settings:
Link Name: "Test 1 - Basic Link"
Leave all security options OFF
Keep "Allow downloads" ✅
Keep "Allow printing" ✅
Click "Create Link"
Expected: Link created successfully with URL like http://localhost:3001/v/[linkId]
Receiver Steps:

Copy the generated link
Open in new browser/incognito window
Expected: Document loads immediately without any prompts
Test Download: Click download button (should work)
Test Print: Try Ctrl+P (should work)
✅ Success Criteria: Document accessible immediately, download/print work

🔒 TEST 2: PASSWORD PROTECTION
Creator Steps:

Upload new document
Create share link with:
Link Name: "Test 2 - Password Protected"
Access Tab → Set password: "TestPass123"
All other settings default
Create link
Receiver Steps:

Access the link
Expected: Password prompt appears
Test Wrong Password: Enter "wrongpass" → Should show error
Test Correct Password: Enter "TestPass123" → Should grant access
Verify document loads after correct password
✅ Success Criteria: Password prompt works, wrong password rejected, correct password grants access

📧 TEST 3: EMAIL VERIFICATION
Creator Steps:

Upload new document
Create share link with:
Link Name: "Test 3 - Email Verification"
Access Tab → Enable "Require email verification" ✅
No password
Create link
Receiver Steps:

Access the link
Expected: Email input prompt appears
Enter email: "test@example.com"
Click "Send Verification Code"
Check Server Logs: Should see verification code generated
Enter the verification code from logs
Expected: Document access granted
✅ Success Criteria: Email prompt appears, verification code sent, code acceptance works

🔐 TEST 4: COMBINED SECURITY
Creator Steps:

Upload new document
Create share link with:
Link Name: "Test 4 - Password + Email"
Access Tab → Set password: "SecurePass456"
Access Tab → Enable "Require email verification" ✅
Create link
Receiver Steps:

Access link
Expected Sequence:
First: Email verification prompt
After email verified: Password prompt
After password: Document access
Test the complete flow
✅ Success Criteria: Both security layers work in sequence

📨 TEST 5: AUTO-EMAIL
Creator Steps:

Upload new document
Create share link with:
Link Name: "Test 5 - Auto Email"
Basic Tab → Enter recipient email: "recipient@test.com"
Basic Tab → Enable "Automatically send email when link is created" ✅
Create link
Check Server Logs: Should see auto-email triggered
Expected Logs:

✅ Success Criteria: Auto-email logs appear, email sending API called

👁️ TEST 6: VIEW LIMITS
Creator Steps:

Upload new document
Create share link with:
Link Name: "Test 6 - View Limit"
Security Tab → Set "View limit": 2
Create link
Receiver Steps:

Access link (1st time) → Should work
Refresh/access again (2nd time) → Should work
Refresh/access again (3rd time) → Should be blocked with "view limit reached" message
✅ Success Criteria: Link works for specified number of views, then blocks access

⏰ TEST 7: EXPIRATION
Creator Steps:

Upload new document
Create share link with:
Link Name: "Test 7 - Expiration"
Access Tab → Set expiration: 5 minutes from now
Create link
Receiver Steps:

Access immediately → Should work
Wait 6 minutes → Access again → Should be blocked with "expired" message
✅ Success Criteria: Link works before expiration, blocked after expiration

🚫 TEST 8: DOWNLOAD/PRINT RESTRICTIONS
Creator Steps:

Upload new document
Create share link with:
Link Name: "Test 8 - No Downloads"
Security Tab → Disable "Allow downloads" ❌
Security Tab → Disable "Allow printing" ❌
Create link
Receiver Steps:

Access link
Expected: Download button should be hidden/disabled
Expected: Print functionality (Ctrl+P) should be blocked
Verify document is viewable but not downloadable/printable
✅ Success Criteria: Download/print restrictions enforced

🎨 TEST 9: CUSTOMIZATION
Creator Steps:

Upload new document
Create share link with:
Link Name: "Test 9 - Custom Welcome"
Customize Tab → Welcome message: "Welcome to our secure document portal!"
Customize Tab → Display name: "John Doe"
Customize Tab → Custom button: "View Important Document"
Create link
Receiver Steps:

Access link
Expected: Custom welcome message appears
Expected: Display name "John Doe" shown
Expected: Button text shows "View Important Document"
✅ Success Criteria: All customizations appear correctly

📬 TEST 10: EMAIL RESTRICTIONS
Creator Steps:

Upload new document
Create share link with:
Link Name: "Test 10 - Email Restrictions"
Access Tab → Enable "Require email verification" ✅
Access Tab → Click "Manage email and domain access"
Set restriction: "Only allow specific emails"
Add allowed email: "allowed@test.com"
Create link
Receiver Steps:

Access link
Try with blocked email: "blocked@test.com" → Should be rejected
Try with allowed email: "allowed@test.com" → Should work
✅ Success Criteria: Email restrictions enforced correctly

🔍 MONITORING & DEBUGGING
During Testing, Monitor:

Server Logs: Watch terminal for API calls and errors
Browser Console: Check for JavaScript errors
Network Tab: Verify API responses
Database: Check if settings are saved correctly
Common Issues to Watch For:

❌ Compilation errors (restart server if needed)
❌ 404 errors (check API routes exist)
❌ Database field mismatches
❌ Email service configuration
📊 TESTING CHECKLIST
Use this checklist to track your testing progress:

Test 1: Basic Link (No Security)
Test 2: Password Protection
Test 3: Email Verification
Test 4: Combined Security (Password + Email)
Test 5: Auto-Email Functionality
Test 6: View Limits
Test 7: Expiration
Test 8: Download/Print Restrictions
Test 9: Customization (Welcome Message, Button Text)
Test 10: Email/Domain Restrictions
🎯 NEXT STEPS
Start with Test 1 (Basic Link) to ensure core functionality works
Progress through tests sequentially
Report any issues you encounter with specific test numbers
I'll monitor server logs and help debug any problems
Once basic tests pass, we can test advanced features like NDA, watermarks, etc.
Ready to start testing! Begin with Test 1 and let me know how it goes! 🚀

