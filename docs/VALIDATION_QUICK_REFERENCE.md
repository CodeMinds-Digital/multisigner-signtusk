# 📋 EMAIL VALIDATION - QUICK REFERENCE

## ✅ **VALIDATION RULES**

### **1. Duplicate Email** ❌
```
Signer 1: john@example.com
Signer 2: john@example.com  ← ❌ ERROR
```
**Error**: "Duplicate email detected. Each signer must have a unique email address."

---

### **2. Requester Email** ❌
```
Logged in as: user@company.com
Signer: user@company.com  ← ❌ ERROR
```
**Error**: "You cannot send a signature request to your own email."

---

### **3. Invalid Format** ❌
```
Signer: ram@cod  ← ❌ ERROR (missing TLD)
Signer: user@    ← ❌ ERROR (incomplete)
Signer: @domain  ← ❌ ERROR (missing local part)
```
**Error**: "Invalid email format. Please enter a valid email address."

---

### **4. Valid Email** ✅
```
Signer: john@example.com     ✅
Signer: jane@company.co.uk   ✅
Signer: user.name@domain.io  ✅
```

---

## 🎨 **VISUAL FEEDBACK**

### **Normal State**:
```
┌──────────────────────────────────────┐
│ [1] [John Doe] [john@example.com]   │
└──────────────────────────────────────┘
```

### **Error State**:
```
┌──────────────────────────────────────┐
│ [1] [John Doe] [john@example.com]   │  ← Red border + background
│     ⚠️ Duplicate email               │  ← Error message
└──────────────────────────────────────┘
```

---

## 🔄 **VALIDATION TIMING**

| Validation Type | When It Runs | Visual Feedback |
|----------------|--------------|-----------------|
| **Format Check** | As you type | Immediate |
| **Duplicate Check** | As you type | Immediate |
| **Requester Check** | As you type | Immediate |
| **Submit Check** | On button click | Error message |

---

## 🧪 **QUICK TEST CASES**

### **Test 1: Duplicate**
1. Add `john@test.com` to Signer 1
2. Add `john@test.com` to Signer 2
3. ✅ Should see "Duplicate email" error

### **Test 2: Self-Signing**
1. Login as `user@company.com`
2. Add `user@company.com` as signer
3. ✅ Should see "Cannot use your own email" error

### **Test 3: Invalid Format**
1. Type `ram@cod` in email field
2. ✅ Should see "Invalid email format" error

### **Test 4: Case Insensitive**
1. Login as `User@Company.com`
2. Add `user@company.com` as signer
3. ✅ Should detect as duplicate (case-insensitive)

---

## 🎯 **ERROR MESSAGES**

| Scenario | Real-Time Message | Submit Message |
|----------|------------------|----------------|
| **Empty Email** | - | "All signers must have an email address" |
| **Invalid Format** | "Invalid email format" | "Invalid email format: [email]. Please enter a valid email address." |
| **Duplicate** | "Duplicate email" | "Duplicate email detected: [email]. Each signer must have a unique email address." |
| **Requester Email** | "Cannot use your own email" | "You cannot send a signature request to your own email. Requester's email cannot be used as a signer." |

---

## 🚀 **USAGE**

### **For Developers**:
```typescript
// Validation function
const validation = validateSigners()
if (!validation.isValid) {
    console.log(validation.error)
}

// Email format check
if (!isValidEmail(email)) {
    // Show error
}
```

### **For Testers**:
1. Open signature request modal
2. Try each test case above
3. Verify error messages appear
4. Verify button is disabled with errors
5. Verify errors clear when fixed

---

## 📊 **VALIDATION COVERAGE**

✅ **6/6 Cases Implemented**:
- ✅ Duplicate email detection
- ✅ Requester email restriction  
- ✅ Single-signature validation
- ✅ Sequential & parallel mode support
- ✅ Email format validation
- ✅ Cross-service consistency

---

## 🎉 **STATUS: COMPLETE**

All email validation requirements have been successfully implemented with real-time feedback and comprehensive error handling.

**Test Command**: `npm run dev`

**Test Location**: Signature Request Modal → Signer Configuration Step

