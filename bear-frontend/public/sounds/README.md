# 🔊 Sound Files for BEAR System

## **Required Sound Files:**

### **1. Emergency Alert Sound**
- **File**: `bear-alert.mp3`
- **Purpose**: Plays when new incidents are created
- **Volume**: 0.8 (80%)

### **2. Resolved Chime Sound** ⭐ NEW
- **File**: `resolved_chime.mp3`
- **Purpose**: Plays when incidents are resolved
- **Volume**: 0.7 (70%) - slightly lower than emergency sound

## **📁 File Structure:**
```
bear-frontend/public/sounds/
├── bear-alert.mp3          # Emergency incidents
├── resolved_chime.mp3      # Resolved incidents ⭐ NEW
└── README.md              # This file
```

## **🎵 Sound Requirements:**

### **Emergency Alert (`bear-alert.mp3`):**
- **Format**: MP3
- **Duration**: 2-5 seconds
- **Volume**: Loud, attention-grabbing
- **Purpose**: Alert users to new emergencies

### **Resolved Chime (`resolved_chime.mp3`):**
- **Format**: MP3
- **Duration**: 1-3 seconds
- **Volume**: Pleasant, calming
- **Purpose**: Notify users that an incident has been resolved

## **🧪 Testing Sounds:**

### **In Browser Console (Development Mode):**
```javascript
// Test emergency sound
window.testSound()

// Test resolved chime
window.testResolvedSound()

// Test full emergency notification
window.testNotification()

// Test full resolved notification
window.testResolvedNotification()
```

## **✅ How It Works:**

1. **New Incident** → Plays `bear-alert.mp3`
2. **Status Update** → Plays `bear-alert.mp3` (for non-resolved updates)
3. **Incident Resolved** → Plays `resolved_chime.mp3` ⭐

## **🔧 Adding Your Sounds:**

1. **Replace `bear-alert.mp3`** with your emergency sound
2. **Add `resolved_chime.mp3`** with your resolved chime sound
3. **Test using the console commands above**

The system will automatically detect and use your custom sounds! 🎉
