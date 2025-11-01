# 🧪 Schedule Module - End-to-End Test Flow

## 📋 Overview

This document provides comprehensive end-to-end test flows for all Schedule module features, covering both **Quick Meeting** and **Business Meeting** appointment types.

---

## 🎯 Test Environment Setup

### Prerequisites
- ✅ Application running on `http://localhost:3000`
- ✅ User authenticated and logged in
- ✅ Database tables created (13 meeting-related tables)
- ✅ Email service configured (Resend)
- ✅ QStash configured for reminders
- ✅ Supabase configured with proper RLS policies

### Test Data Requirements
- Valid user account with profile
- Test email addresses for notifications
- Sample documents for Business Meeting workflows
- Valid timezone configurations
- **No API keys required** - Schedule module works without external API dependencies

---

## 🚀 Test Flow 1: Schedule Dashboard

### **Step 1.1: Access Schedule Module**
1. Navigate to `/schedule`
2. **Expected**: Dashboard loads with overview cards
3. **Verify**: 
   - Total bookings count
   - Upcoming meetings display
   - Recent activity feed
   - Quick action buttons visible

### **Step 1.2: Dashboard Statistics**
1. Check overview metrics
2. **Expected**: Real-time statistics display
3. **Verify**:
   - Booking counts by status
   - Revenue metrics (if applicable)
   - Meeting type distribution
   - Time period filters work

### **Step 1.3: Navigation Menu**
1. Test sidebar navigation
2. **Expected**: All menu items accessible
3. **Verify**:
   - Dashboard ✅
   - Quick Meeting ✅
   - Business Meeting ✅
   - My Bookings ✅
   - Availability ✅
   - Meeting Types ✅
   - Settings ✅

---

## 📅 Test Flow 2: Quick Meeting Booking

### **Step 2.1: Access Quick Meeting Page**
1. Navigate to `/schedule/quick-meeting`
2. **Expected**: Quick meeting booking interface loads
3. **Verify**:
   - Meeting type selector visible
   - Calendar component loads
   - Form fields present
   - "Back to Schedule" button works

### **Step 2.2: Select Meeting Type**
1. Choose a Quick Meeting type from dropdown
2. **Expected**: Meeting details update
3. **Verify**:
   - Duration displays correctly
   - Description shows
   - Price (if applicable) visible
   - Meeting format indicated

### **Step 2.3: Date Selection**
1. Click on calendar to select date
2. **Expected**: Available time slots load
3. **Verify**:
   - Only future dates selectable
   - Availability API call succeeds
   - Time slots display in user timezone
   - Unavailable slots are disabled

### **Step 2.4: Time Slot Selection**
1. Select an available time slot
2. **Expected**: Time slot highlights
3. **Verify**:
   - Selected time persists
   - Form becomes active
   - Booking details update

### **Step 2.5: Guest Information Form**
1. Fill out guest details:
   - Name (required)
   - Email (required)
   - Phone (optional)
   - Company (optional)
   - Notes (optional)
2. **Expected**: Form validation works
3. **Verify**:
   - Required field validation
   - Email format validation
   - Character limits respected

### **Step 2.6: Submit Booking**
1. Click "Book Meeting" button
2. **Expected**: Booking creation succeeds
3. **Verify**:
   - Success message displays
   - Booking confirmation shown
   - Email confirmation sent
   - Calendar invite generated
   - Booking appears in database

### **Step 2.7: Booking Confirmation**
1. Review booking confirmation
2. **Expected**: All details correct
3. **Verify**:
   - Meeting details accurate
   - Date/time correct
   - Guest information saved
   - Booking token generated
   - Video link created (if applicable)

---

## 📋 Test Flow 3: Business Meeting Booking

### **Step 3.1: Access Business Meeting Page**
1. Navigate to `/schedule/business-meeting`
2. **Expected**: Business meeting interface loads
3. **Verify**:
   - Advanced form fields visible
   - Document workflow options
   - Project details section
   - Budget/timeline fields

### **Step 3.2: Select Business Meeting Type**
1. Choose Business Meeting type
2. **Expected**: Advanced options appear
3. **Verify**:
   - Workflow type selection
   - Document requirements shown
   - Signature requirements indicated
   - MFA requirements (if applicable)

### **Step 3.3: Project Details**
1. Fill out business-specific fields:
   - Project details
   - Budget range
   - Timeline
   - Special requirements
2. **Expected**: Fields save properly
3. **Verify**:
   - Text area expansion
   - Character counting
   - Field validation

### **Step 3.4: Document Workflow Setup**
1. Configure document requirements
2. **Expected**: Workflow options available
3. **Verify**:
   - Document upload options
   - Signature requirements
   - Approval workflows
   - Security settings

### **Step 3.5: Complete Business Booking**
1. Submit business meeting booking
2. **Expected**: Advanced booking created
3. **Verify**:
   - Workflow triggered
   - Document requests sent
   - Business-specific notifications
   - CRM integration (if applicable)

---

## 📊 Test Flow 4: Bookings Management

### **Step 4.1: Access Bookings Page**
1. Navigate to `/schedule/bookings`
2. **Expected**: Bookings list loads
3. **Verify**:
   - All bookings displayed
   - Status indicators correct
   - Search functionality works
   - Filter options available

### **Step 4.2: Search and Filter**
1. Test search functionality:
   - Search by guest name
   - Search by email
   - Search by company
2. **Expected**: Results filter correctly
3. **Verify**:
   - Real-time search
   - Case-insensitive matching
   - Clear search option

### **Step 4.3: Status Filters**
1. Filter by booking status:
   - Pending
   - Confirmed
   - Completed
   - Cancelled
   - No-show
2. **Expected**: Filters work correctly
3. **Verify**:
   - Count updates
   - Multiple filters
   - Clear all filters

### **Step 4.4: Booking Actions**
1. Test booking management:
   - View booking details
   - Reschedule booking
   - Cancel booking
   - Mark as completed
   - Add notes
2. **Expected**: Actions execute successfully
3. **Verify**:
   - Status updates
   - Notifications sent
   - Database updates
   - Audit trail created

### **Step 4.5: Bulk Operations**
1. Select multiple bookings
2. **Expected**: Bulk actions available
3. **Verify**:
   - Mass status updates
   - Bulk notifications
   - Export functionality
   - Batch processing

---

## ⏰ Test Flow 5: Availability Settings

### **Step 5.1: Access Availability Page**
1. Navigate to `/schedule/availability`
2. **Expected**: Availability settings load
3. **Verify**:
   - Weekly schedule grid
   - Timezone selector
   - Buffer time settings
   - Booking window controls

### **Step 5.2: Weekly Schedule Configuration**
1. Set availability for each day:
   - Enable/disable days
   - Set start/end times
   - Add multiple time blocks
   - Set breaks/lunch hours
2. **Expected**: Schedule saves correctly
3. **Verify**:
   - Time validation
   - Overlap prevention
   - Timezone conversion
   - Visual feedback

### **Step 5.3: Advanced Settings**
1. Configure advanced options:
   - Buffer time between meetings
   - Maximum advance booking
   - Minimum notice period
   - Date-specific overrides
2. **Expected**: Settings apply correctly
3. **Verify**:
   - Validation rules
   - Conflict detection
   - Preview functionality
   - Save confirmation

### **Step 5.4: Date Overrides**
1. Add specific date overrides:
   - Holiday closures
   - Extended hours
   - Special availability
2. **Expected**: Overrides work correctly
3. **Verify**:
   - Date picker functionality
   - Override priority
   - Conflict resolution
   - Calendar integration

---

## 🎯 Test Flow 6: Meeting Types Management

### **Step 6.1: Access Meeting Types Page**
1. Navigate to `/schedule/meeting-types`
2. **Expected**: Meeting types list loads
3. **Verify**:
   - Existing types displayed
   - Create new type button
   - Edit/delete options
   - Usage statistics

### **Step 6.2: Create New Meeting Type**
1. Click "Create Meeting Type"
2. Fill out form:
   - Name and description
   - Duration
   - Meeting format
   - Pricing (if applicable)
   - Workflow settings
3. **Expected**: Type created successfully
3. **Verify**:
   - Form validation
   - Unique name check
   - Settings persistence
   - URL generation

### **Step 6.3: Configure Advanced Settings**
1. Set up advanced options:
   - Document requirements
   - Signature workflows
   - MFA requirements
   - Access restrictions
2. **Expected**: Advanced settings save
3. **Verify**:
   - Conditional logic
   - Security settings
   - Integration options
   - Preview functionality

### **Step 6.4: Test Meeting Type**
1. Use newly created meeting type
2. **Expected**: Type works in booking flow
3. **Verify**:
   - Appears in dropdowns
   - Settings apply correctly
   - Workflows trigger
   - Analytics track usage

---

## ⚙️ Test Flow 7: Settings Configuration

### **Step 7.1: Branding Settings**
1. Navigate to `/schedule/settings/branding`
2. **Expected**: Branding options load
3. **Verify**:
   - Company information
   - Logo upload
   - Color customization
   - Custom domain settings

### **Step 7.2: Notification Settings**
1. Navigate to `/schedule/settings/notifications`
2. **Expected**: Notification preferences load
3. **Verify**:
   - Email toggles
   - Reminder timing
   - Template customization
   - Test email functionality

### **Step 7.3: Integration Settings**
1. Navigate to `/schedule/settings/integrations`
2. **Expected**: Integration options load
3. **Verify**:
   - Calendar connections
   - CRM integrations
   - Payment processors
   - Webhook configurations

---

## 🔄 Test Flow 8: End-to-End Booking Workflow

### **Step 8.1: Complete Quick Meeting Flow**
1. Create → Book → Confirm → Attend → Complete
2. **Expected**: Full lifecycle works
3. **Verify**:
   - All notifications sent
   - Status updates correct
   - Analytics recorded
   - Follow-up actions

### **Step 8.2: Complete Business Meeting Flow**
1. Create → Configure → Book → Document → Sign → Meet → Complete
2. **Expected**: Advanced workflow executes
3. **Verify**:
   - Document workflows
   - Signature collection
   - Approval processes
   - Integration triggers

---

## 📧 Test Flow 9: Email Notifications

### **Step 9.1: Booking Confirmations**
1. Verify email delivery for:
   - Guest confirmation
   - Host notification
   - Calendar invites
2. **Expected**: All emails delivered
3. **Verify**:
   - Correct recipients
   - Accurate information
   - Proper formatting
   - Action buttons work

### **Step 9.2: Reminder Notifications**
1. Test reminder system:
   - 24-hour reminders
   - 1-hour reminders
   - Custom reminders
2. **Expected**: Reminders sent on schedule
3. **Verify**:
   - Timing accuracy
   - Content correctness
   - Delivery confirmation
   - Unsubscribe options

---

## 📱 Test Flow 10: Mobile Responsiveness

### **Step 10.1: Mobile Booking Experience**
1. Test on mobile devices:
   - Calendar interaction
   - Form completion
   - Navigation
2. **Expected**: Mobile-friendly interface
3. **Verify**:
   - Touch interactions
   - Responsive layout
   - Performance
   - Accessibility

---

## 🔍 Test Flow 11: Error Handling

### **Step 11.1: Network Errors**
1. Test with poor connectivity
2. **Expected**: Graceful degradation
3. **Verify**:
   - Error messages
   - Retry mechanisms
   - Data persistence
   - User feedback

### **Step 11.2: Validation Errors**
1. Test invalid inputs
2. **Expected**: Clear error messages
3. **Verify**:
   - Field-level validation
   - Form-level validation
   - User guidance
   - Error recovery

---

## ✅ Success Criteria

### **Functional Requirements**
- ✅ All booking flows complete successfully
- ✅ Data persists correctly in database
- ✅ Email notifications deliver properly
- ✅ Calendar integrations work
- ✅ Payment processing (if applicable)

### **Performance Requirements**
- ✅ Page load times < 3 seconds
- ✅ API response times < 1 second
- ✅ Real-time updates work smoothly
- ✅ Mobile performance acceptable

### **User Experience Requirements**
- ✅ Intuitive navigation
- ✅ Clear error messages
- ✅ Responsive design
- ✅ Accessibility compliance

---

## 🐛 Common Issues & Troubleshooting

### **Database Issues**
- Check table relationships
- Verify RLS policies
- Confirm data types
- Test foreign key constraints

### **Email Issues**
- Verify Resend configuration
- Check email templates
- Test delivery rates
- Monitor bounce rates

### **Calendar Issues**
- Verify timezone handling
- Check availability calculations
- Test date/time formatting
- Confirm calendar integrations

### **Performance Issues**
- Monitor API response times
- Check database query performance
- Optimize frontend rendering
- Test under load

---

*This test flow ensures comprehensive coverage of all Schedule module features and provides a systematic approach to quality assurance.*
