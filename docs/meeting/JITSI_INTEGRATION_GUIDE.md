# 🎥 Jitsi Meet Integration Guide - Schedule Module

## 🎯 Why Jitsi Meet is Better Than Zoom for Your Use Case

### **✅ Advantages of Jitsi Meet:**
- **No API Keys Required** - Can work without authentication
- **Free & Open Source** - No licensing costs
- **Easy Integration** - Just generate URLs
- **Recording Support** - Built-in recording capabilities
- **Self-Hosted Option** - Full control over data
- **No User Limits** - Unlimited participants
- **GDPR Compliant** - Privacy-focused

### **❌ Zoom Disadvantages:**
- Requires OAuth setup and API keys
- Monthly licensing costs ($14.99/month minimum)
- Complex API integration
- Rate limiting and restrictions
- User account requirements

---

## 🚀 **Quick Jitsi Integration (30 minutes setup)**

### **Option 1: Public Jitsi Meet (Easiest)**

#### **No Setup Required - Just Generate URLs:**
```typescript
// lib/jitsi-meeting-service.ts
export function generateJitsiMeetingLink(booking: any): string {
  // Generate unique room name
  const roomName = `tuskhub-${booking.id}-${Date.now()}`
  
  // Create Jitsi Meet URL
  const jitsiUrl = `https://meet.jit.si/${roomName}`
  
  // Optional: Add URL parameters for customization
  const params = new URLSearchParams({
    'config.startWithAudioMuted': 'true',
    'config.startWithVideoMuted': 'false',
    'config.requireDisplayName': 'true',
    'config.prejoinPageEnabled': 'true',
    'userInfo.displayName': booking.guest_name
  })
  
  return `${jitsiUrl}#${params.toString()}`
}
```

#### **Integration with Booking System:**
```typescript
// Update src/app/api/meetings/book/route.ts
import { generateJitsiMeetingLink } from '@/lib/jitsi-meeting-service'

// In the booking creation logic:
if (meetingType.meeting_format === 'video') {
  const jitsiLink = generateJitsiMeetingLink(booking)
  
  // Save to database
  await supabase
    .from('meeting_video_links')
    .insert({
      booking_id: booking.id,
      platform: 'jitsi',
      meeting_url: jitsiLink,
      host_url: jitsiLink, // Same for Jitsi
      meeting_id: roomName,
      meeting_password: null // Jitsi doesn't require passwords
    })
}
```

### **Option 2: Self-Hosted Jitsi (More Control)**

#### **Docker Setup (5 minutes):**
```bash
# Clone Jitsi Docker setup
git clone https://github.com/jitsi/docker-jitsi-meet
cd docker-jitsi-meet

# Copy environment file
cp env.example .env

# Generate passwords
./gen-passwords.sh

# Start Jitsi
docker-compose up -d
```

#### **Environment Variables:**
```bash
# Add to .env.local
JITSI_DOMAIN=meet.yourdomain.com
JITSI_SECRET=your_jwt_secret
JITSI_APP_ID=your_app_id
```

#### **Custom Domain Integration:**
```typescript
// lib/jitsi-meeting-service.ts
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si'

export function generateJitsiMeetingLink(booking: any): string {
  const roomName = `tuskhub-${booking.id}-${Date.now()}`
  return `https://${JITSI_DOMAIN}/${roomName}`
}
```

---

## 📹 **Recording Integration**

### **Option 1: Jitsi Meet Recording (Built-in)**

#### **Enable Recording in Meeting:**
```typescript
// lib/jitsi-recording-service.ts
export function generateJitsiMeetingWithRecording(booking: any): string {
  const roomName = `tuskhub-${booking.id}-${Date.now()}`
  
  const params = new URLSearchParams({
    'config.recordingService.enabled': 'true',
    'config.recordingService.sharingEnabled': 'true',
    'config.localRecording.enabled': 'true',
    'config.hiddenDomain': 'recorder.meet.jit.si'
  })
  
  return `https://meet.jit.si/${roomName}#${params.toString()}`
}
```

#### **Recording Management:**
```typescript
// Database schema for recordings
// Add to meeting_video_links table:
ALTER TABLE meeting_video_links ADD COLUMN recording_enabled BOOLEAN DEFAULT false;
ALTER TABLE meeting_video_links ADD COLUMN recording_url TEXT;
ALTER TABLE meeting_video_links ADD COLUMN recording_status VARCHAR(50);
```

### **Option 2: Custom Recording with Jibri**

#### **Jibri Setup (Advanced):**
```bash
# Add Jibri service to docker-compose
# Jibri = Jitsi Broadcasting Infrastructure
services:
  jibri:
    image: jitsi/jibri:stable
    volumes:
      - jibri-recordings:/tmp/recordings
    environment:
      - JIBRI_RECORDER_USER=recorder
      - JIBRI_RECORDER_PASSWORD=your_password
```

#### **Recording API Integration:**
```typescript
// lib/jibri-recording.ts
export async function startRecording(roomName: string): Promise<string> {
  const response = await fetch(`https://${JITSI_DOMAIN}/api/start-recording`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      room: roomName,
      session_id: `recording-${Date.now()}`
    })
  })
  
  const result = await response.json()
  return result.recording_id
}

export async function stopRecording(recordingId: string): Promise<string> {
  const response = await fetch(`https://${JITSI_DOMAIN}/api/stop-recording`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recording_id: recordingId })
  })
  
  const result = await response.json()
  return result.download_url
}
```

---

## 🔧 **Implementation Steps**

### **Step 1: Update Video Meeting Service**
```typescript
// src/lib/video-meeting-service.ts
export async function generateVideoMeetingLink(booking: any): Promise<VideoMeetingLink | null> {
  try {
    // Generate Jitsi meeting
    const roomName = `tuskhub-${booking.id}-${Date.now()}`
    const meetingUrl = `https://meet.jit.si/${roomName}`
    
    // Configure meeting parameters
    const params = new URLSearchParams({
      'config.startWithAudioMuted': 'true',
      'config.requireDisplayName': 'true',
      'config.prejoinPageEnabled': 'true',
      'userInfo.displayName': booking.guest_name || 'Guest'
    })
    
    const fullUrl = `${meetingUrl}#${params.toString()}`
    
    return {
      platform: 'jitsi',
      meeting_url: fullUrl,
      host_url: fullUrl, // Same URL for host and guest
      meeting_id: roomName,
      meeting_password: null,
      dial_in_number: null,
      recording_enabled: true // Jitsi supports recording
    }
  } catch (error) {
    console.error('Error generating Jitsi meeting:', error)
    return null
  }
}
```

### **Step 2: Update Package.json Dependencies**
```json
{
  "dependencies": {
    "@jitsi/react-sdk": "^1.3.0",
    "lib-jitsi-meet": "^1.0.0"
  }
}
```

### **Step 3: Add Jitsi React Component (Optional)**
```typescript
// components/meetings/jitsi-meeting.tsx
import { JitsiMeeting } from '@jitsi/react-sdk'

interface JitsiMeetingProps {
  roomName: string
  displayName: string
  onMeetingEnd?: () => void
}

export function JitsiMeetingComponent({ roomName, displayName, onMeetingEnd }: JitsiMeetingProps) {
  return (
    <JitsiMeeting
      domain="meet.jit.si"
      roomName={roomName}
      configOverwrite={{
        startWithAudioMuted: true,
        disableModeratorIndicator: true,
        startScreenSharing: false,
        enableEmailInStats: false
      }}
      interfaceConfigOverwrite={{
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
      }}
      userInfo={{
        displayName: displayName
      }}
      onApiReady={(externalApi) => {
        // Meeting API ready
        console.log('Jitsi API ready')
      }}
      getIFrameRef={(iframeRef) => {
        iframeRef.style.height = '600px'
      }}
    />
  )
}
```

---

## 📊 **Comparison: Jitsi vs Zoom**

| Feature | Jitsi Meet | Zoom |
|---------|------------|------|
| **Setup Time** | 30 minutes | 2-3 weeks |
| **API Keys** | None required | OAuth + API keys |
| **Cost** | Free | $14.99/month minimum |
| **Recording** | Built-in | API required |
| **Participants** | Unlimited | Limited by plan |
| **Integration** | URL generation | Complex API |
| **Privacy** | Self-hosted option | Cloud only |
| **Customization** | Full control | Limited |

---

## 🎯 **Recommended Implementation**

### **Phase 1: Basic Jitsi (1 day)**
```typescript
// Simple URL generation - no API keys needed
const meetingUrl = `https://meet.jit.si/tuskhub-${bookingId}`
```

### **Phase 2: Enhanced Features (1 week)**
```typescript
// Add recording, custom parameters, branding
// Self-hosted Jitsi for full control
```

### **Phase 3: Advanced Integration (2 weeks)**
```typescript
// Embedded meetings, recording management
// Custom UI and branding
```

---

## 🔒 **Security & Privacy**

### **Public Jitsi Meet:**
- ✅ End-to-end encryption
- ✅ No account required
- ✅ GDPR compliant
- ⚠️ Meetings on public servers

### **Self-Hosted Jitsi:**
- ✅ Full data control
- ✅ Custom security policies
- ✅ Private infrastructure
- ✅ Compliance ready

---

## 💡 **Pro Tips**

### **Room Name Security:**
```typescript
// Generate secure, unique room names
const roomName = `tuskhub-${booking.id}-${crypto.randomUUID()}`
```

### **Meeting Customization:**
```typescript
// Brand the meeting experience
const params = {
  'config.defaultLocalDisplayName': 'TuskHub Guest',
  'config.defaultRemoteDisplayName': 'TuskHub Host',
  'interfaceConfig.APP_NAME': 'TuskHub Meeting',
  'interfaceConfig.BRAND_WATERMARK_LINK': 'https://tuskhub.com'
}
```

### **Recording Management:**
```typescript
// Automatically start recording for business meetings
if (meetingType.type === 'business-meeting') {
  params['config.autoRecord'] = 'true'
}
```

---

## 🎉 **Benefits for Your Schedule Module**

### **Immediate Benefits:**
- ✅ **No API setup required** - works immediately
- ✅ **No monthly costs** - completely free
- ✅ **Recording included** - built-in feature
- ✅ **Easy to implement** - just URL generation

### **Long-term Benefits:**
- ✅ **Scalable** - no user limits
- ✅ **Customizable** - full control over experience
- ✅ **Privacy-focused** - self-hosted option
- ✅ **Open source** - no vendor lock-in

**Bottom Line:** Jitsi Meet is perfect for your Schedule module - easier than Zoom, free, includes recording, and can be implemented in hours instead of weeks! 🚀
