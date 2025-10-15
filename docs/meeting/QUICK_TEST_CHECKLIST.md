# ⚡ Schedule Module - Quick Test Checklist

## 🎯 Immediate Testing Guide

This checklist provides a rapid testing approach for verifying Schedule module functionality.

---

## 🚀 Pre-Test Setup (5 minutes)

### **Environment Check**
- [ ] Application running on `http://localhost:3000`
- [ ] User logged in successfully
- [ ] No console errors on page load
- [ ] Database connection working
- [ ] **No API keys needed** - Schedule module is self-contained

### **Quick Smoke Test**
- [ ] Navigate to `/schedule` - page loads
- [ ] Sidebar navigation visible
- [ ] No 404 errors on any Schedule pages

---

## 📋 Core Functionality Tests (15 minutes)

### **1. Schedule Dashboard** (`/schedule`)
- [ ] Page loads without errors
- [ ] Overview cards display data
- [ ] Navigation menu works
- [ ] "Quick Meeting" and "Business Meeting" buttons functional

### **2. Quick Meeting Booking** (`/schedule/quick-meeting`)
- [ ] Page loads successfully
- [ ] Meeting type dropdown works
- [ ] Calendar component displays
- [ ] Date selection works
- [ ] Time slots load (may show mock data)
- [ ] Form fields accept input
- [ ] "Back to Schedule" button works

### **3. Business Meeting Booking** (`/schedule/business-meeting`)
- [ ] Page loads successfully
- [ ] Advanced form fields visible
- [ ] Project details section works
- [ ] Budget/timeline fields functional
- [ ] Navigation back works

### **4. Bookings Management** (`/schedule/bookings`)
- [ ] Page loads without errors
- [ ] Bookings list displays (may be empty)
- [ ] Search functionality present
- [ ] Filter options available
- [ ] Status indicators visible

### **5. Availability Settings** (`/schedule/availability`)
- [ ] Page loads successfully
- [ ] Weekly schedule grid displays
- [ ] Timezone selector works
- [ ] Time input fields functional
- [ ] Save button present

### **6. Meeting Types** (`/schedule/meeting-types`)
- [ ] Page loads without errors
- [ ] Meeting types list displays
- [ ] "Create New Type" button works
- [ ] Edit/delete options visible

---

## ⚙️ Settings Pages Tests (10 minutes)

### **7. Branding Settings** (`/schedule/settings/branding`)
- [ ] Page loads successfully
- [ ] Company information fields
- [ ] Color picker works
- [ ] Logo upload section present
- [ ] Save functionality available

### **8. Notification Settings** (`/schedule/settings/notifications`)
- [ ] Page loads without errors
- [ ] Email toggle switches work
- [ ] Reminder timing options
- [ ] Template customization available

### **9. Integration Settings** (`/schedule/settings/integrations`)
- [ ] Page loads successfully
- [ ] Calendar integration options
- [ ] Connection status indicators
- [ ] Configuration forms present

---

## 🔄 Navigation Tests (5 minutes)

### **10. Cross-Navigation**
- [ ] All sidebar links work
- [ ] Breadcrumb navigation functional
- [ ] Back buttons work correctly
- [ ] No broken internal links

### **11. Mobile Responsiveness**
- [ ] Resize browser to mobile width
- [ ] Navigation menu adapts
- [ ] Forms remain usable
- [ ] Calendar component responsive

---

## 🧪 API Endpoint Tests (10 minutes)

### **12. API Health Check**
Open browser developer tools and test these endpoints:

#### **Meeting Types API**
```bash
# Test in browser console or Postman
fetch('/api/meetings/types')
  .then(r => r.json())
  .then(console.log)
```
- [ ] Returns 200 status
- [ ] Returns JSON response
- [ ] No server errors

#### **Availability API**
```bash
# Test availability check
fetch('/api/meetings/availability/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    meeting_type_id: 'test-id',
    date: '2024-12-01'
  })
})
```
- [ ] Returns response (may be error due to test data)
- [ ] No 500 server errors
- [ ] Proper error handling

#### **Analytics API**
```bash
# Test analytics endpoint
fetch('/api/meetings/analytics?type=overview')
  .then(r => r.json())
  .then(console.log)
```
- [ ] Returns 200 status
- [ ] Returns analytics data
- [ ] No server errors

---

## 🎨 UI/UX Tests (5 minutes)

### **13. Visual Elements**
- [ ] Icons display correctly
- [ ] Colors and styling consistent
- [ ] Loading states work
- [ ] Toast notifications appear
- [ ] Form validation messages show

### **14. Interactive Elements**
- [ ] Buttons respond to clicks
- [ ] Form inputs accept data
- [ ] Dropdowns open/close
- [ ] Switches toggle correctly
- [ ] Calendar navigation works

---

## 🔍 Error Handling Tests (5 minutes)

### **15. Network Simulation**
- [ ] Disable network in dev tools
- [ ] Try to navigate pages
- [ ] Check error messages
- [ ] Re-enable network
- [ ] Verify recovery

### **16. Invalid Data**
- [ ] Submit forms with missing required fields
- [ ] Enter invalid email formats
- [ ] Test with special characters
- [ ] Verify validation messages

---

## ✅ Quick Pass/Fail Criteria

### **PASS Criteria** ✅
- All pages load without 500 errors
- Navigation works between all pages
- Forms accept input and show validation
- API endpoints return responses (even if empty)
- No critical console errors
- Mobile layout doesn't break

### **FAIL Criteria** ❌
- Any page returns 500 error
- Navigation completely broken
- Forms don't accept input
- API endpoints return 500 errors
- Critical JavaScript errors
- Mobile layout completely broken

---

## 🚨 Critical Issues to Report

### **Immediate Blockers**
- [ ] Pages won't load (500 errors)
- [ ] Database connection failures
- [ ] Authentication issues
- [ ] Complete navigation failure

### **High Priority Issues**
- [ ] Form submission failures
- [ ] API endpoint failures
- [ ] Data not persisting
- [ ] Email notifications not working

### **Medium Priority Issues**
- [ ] UI styling problems
- [ ] Mobile responsiveness issues
- [ ] Performance problems
- [ ] Minor validation issues

---

## 📊 Test Results Summary

### **Test Execution Time**: _____ minutes
### **Total Tests**: 16 categories
### **Passed**: _____ / 16
### **Failed**: _____ / 16
### **Critical Issues**: _____ 
### **Overall Status**: PASS / FAIL

---

## 🔧 Quick Fixes for Common Issues

### **If Pages Don't Load**
1. Check if `npm run dev` is running
2. Verify database connection
3. Check for TypeScript errors
4. Clear browser cache

### **If APIs Fail**
1. Check server logs
2. Verify database tables exist
3. Check environment variables
4. Test with Postman/curl

### **If Styling Broken**
1. Check CSS imports
2. Verify Tailwind CSS working
3. Check for conflicting styles
4. Test in different browsers

---

## 📝 Notes Section

**Issues Found:**
- 
- 
- 

**Recommendations:**
- 
- 
- 

**Next Steps:**
- 
- 
- 

---

*This checklist provides a systematic approach to quickly verify Schedule module functionality and identify any critical issues that need immediate attention.*
