# Send Module Comprehensive Testing Plan

## 🎯 **Phase 2: Data Room Create Share Testing** [IN PROGRESS]

### ✅ **Test 2.1: Data Room Link Creation via UI**

**Test Setup:**
- Data Room: "Test" (ID: 051ca1f8-053b-4377-be0d-4c59affb1d5c)
- Document: "2025-HR Employee Application Form.pdf" (added to /testing folder)
- URL: http://localhost:3002/send/data-rooms

**Test Cases:**

#### 2.1.1 Basic Link Creation ✅ **READY TO TEST**
- [ ] Navigate to data room "Test"
- [ ] Click "Share" button
- [ ] Create basic link with name "Test Basic Link"
- [ ] Verify link is generated with format: `/v/{slug}`
- [ ] Copy link and verify it's accessible

#### 2.1.2 Password-Protected Link ⏳ **NEXT**
- [ ] Create link with password "TestPass123!"
- [ ] Verify password is hashed in database
- [ ] Test link access requires password
- [ ] Test correct password allows access
- [ ] Test incorrect password is rejected

#### 2.1.3 Link with Expiry Date ⏳ **NEXT**
- [ ] Create link with expiry date (24 hours from now)
- [ ] Verify expiry date is stored correctly
- [ ] Test link works before expiry
- [ ] Test link is blocked after expiry (simulate by changing DB)

#### 2.1.4 Link with View Limit ⏳ **NEXT**
- [ ] Create link with view limit of 3
- [ ] Test link works for first 3 views
- [ ] Test link is blocked on 4th view
- [ ] Verify view count increments correctly

#### 2.1.5 Link with Watermark & Screenshot Protection ⏳ **NEXT**
- [ ] Create link with watermark enabled
- [ ] Create link with screenshot protection enabled
- [ ] Verify settings are stored correctly
- [ ] Test viewer shows appropriate restrictions

### ✅ **Test 2.2: Access Controls Enforcement**

#### 2.2.1 Password Protection Flow ⏳ **PENDING**
- [ ] Access password-protected link
- [ ] Verify password prompt appears
- [ ] Test password validation
- [ ] Test session persistence after correct password

#### 2.2.2 Email Verification Flow ⏳ **PENDING**
- [ ] Create link requiring email verification
- [ ] Test email verification prompt
- [ ] Test OTP code generation and validation
- [ ] Test email verification bypass for owner

#### 2.2.3 View Limit Enforcement ⏳ **PENDING**
- [ ] Test view count tracking
- [ ] Test limit enforcement
- [ ] Test different visitor sessions
- [ ] Test owner bypass of view limits

#### 2.2.4 Expiry Date Checking ⏳ **PENDING**
- [ ] Test active link access
- [ ] Test expired link blocking
- [ ] Test expiry message display
- [ ] Test timezone handling

### ✅ **Test 2.3: Link Management (Edit/Delete)**

#### 2.3.1 Edit Link Settings ⏳ **PENDING**
- [ ] Edit link name
- [ ] Change password
- [ ] Modify expiry date
- [ ] Update view limit
- [ ] Toggle watermark/screenshot protection

#### 2.3.2 Delete Links ⏳ **PENDING**
- [ ] Delete link via UI
- [ ] Verify link is removed from database
- [ ] Test deleted link returns 404
- [ ] Test bulk delete functionality

### ✅ **Test 2.4: Data Room Public Viewer**

#### 2.4.1 Folder Navigation ⏳ **PENDING**
- [ ] Access data room link
- [ ] Verify folder structure displays correctly
- [ ] Test folder navigation (Root → testing)
- [ ] Test breadcrumb navigation
- [ ] Test back button functionality

#### 2.4.2 Document Preview ⏳ **PENDING**
- [ ] Click on document in data room
- [ ] Verify document preview opens
- [ ] Test PDF viewer functionality
- [ ] Test zoom controls
- [ ] Test download/print buttons (if enabled)

#### 2.4.3 Back Navigation ⏳ **PENDING**
- [ ] Navigate from data room to document
- [ ] Use back button to return to data room
- [ ] Test browser back button
- [ ] Test breadcrumb navigation

#### 2.4.4 Analytics Tracking ⏳ **PENDING**
- [ ] Verify data room view is tracked
- [ ] Verify document view is tracked
- [ ] Test visitor session creation
- [ ] Test real-time analytics updates

---

## 🎯 **Phase 3: Notification & Email Testing** [PENDING]

### ✅ **Test 3.1: Email Notifications**

#### 3.1.1 Document Viewed Notifications ⏳ **PENDING**
- [ ] Configure email notifications in settings
- [ ] Access shared document
- [ ] Verify email notification is sent
- [ ] Check email content and formatting

#### 3.1.2 Download Notifications ⏳ **PENDING**
- [ ] Download document from shared link
- [ ] Verify download notification email
- [ ] Test notification preferences

#### 3.1.3 High Engagement Alerts ⏳ **PENDING**
- [ ] Generate high engagement (multiple views)
- [ ] Verify high engagement email alert
- [ ] Test engagement threshold settings

### ✅ **Test 3.2: Real-time Notifications**

#### 3.2.1 Supabase Realtime Integration ⏳ **PENDING**
- [ ] Test real-time view notifications
- [ ] Test real-time analytics updates
- [ ] Verify WebSocket connections

#### 3.2.2 Toast Notifications ⏳ **PENDING**
- [ ] Test in-app toast notifications
- [ ] Test notification dismissal
- [ ] Test notification queuing

#### 3.2.3 Notification Preferences ⏳ **PENDING**
- [ ] Test notification settings page
- [ ] Test email notification toggle
- [ ] Test real-time notification toggle

---

## 🎯 **Phase 4: Analytics Verification** [PENDING]

### ✅ **Test 4.1: Tracking Accuracy**

#### 4.1.1 Document View Tracking ⏳ **PENDING**
- [ ] View single document multiple times
- [ ] Verify view count accuracy
- [ ] Test unique visitor tracking
- [ ] Test session-based tracking

#### 4.1.2 Data Room View Tracking ⏳ **PENDING**
- [ ] Access data room multiple times
- [ ] Verify data room view tracking
- [ ] Test folder navigation tracking
- [ ] Test document access from data room

#### 4.1.3 Download/Print Tracking ⏳ **PENDING**
- [ ] Download documents
- [ ] Print documents
- [ ] Verify download/print events tracked
- [ ] Test analytics dashboard updates

#### 4.1.4 Engagement Metrics ⏳ **PENDING**
- [ ] Test engagement score calculation
- [ ] Test time-based metrics
- [ ] Test geographic tracking
- [ ] Test device/browser tracking

### ✅ **Test 4.2: Real-time Analytics Updates**

#### 4.2.1 Dashboard Updates ⏳ **PENDING**
- [ ] Open analytics dashboard
- [ ] Generate activity on shared links
- [ ] Verify real-time dashboard updates
- [ ] Test chart data updates

#### 4.2.2 Visitor Session Tracking ⏳ **PENDING**
- [ ] Test visitor session creation
- [ ] Test session duration tracking
- [ ] Test session activity updates
- [ ] Test session termination

#### 4.2.3 Performance Metrics ⏳ **PENDING**
- [ ] Test page load tracking
- [ ] Test document load times
- [ ] Test viewer performance metrics
- [ ] Test analytics query performance

---

## 📊 **Test Results Summary**

### **Phase 2 Progress: 0/16 tests completed**
- Data Room Link Creation: 0/5 ✅ **READY**
- Access Controls: 0/4 ⏳ **PENDING**
- Link Management: 0/2 ⏳ **PENDING**
- Public Viewer: 0/4 ⏳ **PENDING**

### **Phase 3 Progress: 0/8 tests completed**
- Email Notifications: 0/3 ⏳ **PENDING**
- Real-time Notifications: 0/3 ⏳ **PENDING**

### **Phase 4 Progress: 0/8 tests completed**
- Tracking Accuracy: 0/4 ⏳ **PENDING**
- Real-time Updates: 0/3 ⏳ **PENDING**

### **Overall Progress: 0/32 tests completed (0%)**

---

## 🚀 **Next Immediate Action**
**Start Test 2.1.1: Basic Link Creation**
1. Navigate to http://localhost:3002/send/data-rooms
2. Click on "Test" data room
3. Click "Share" button
4. Create basic link and verify functionality
