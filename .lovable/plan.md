

## Native Handheld RFID Integration Plan
### Mivanta CX1500N UHF Reader + Your Toll Automation PWA

---

### What We're Building

A native Android wrapper for your existing toll automation web app that integrates directly with the Mivanta CX1500N UHF RFID handheld reader, enabling both **single-tap reads** and **continuous inventory scanning**.

---

### Phase 1: Capacitor Android Setup

**Goal:** Convert your PWA into a native Android app

- Install Capacitor core dependencies
- Configure the app for deployment on the CX1500N device
- Set up hot-reload so you can test while developing
- Create project structure for SDK integration

**What you'll experience:** Your existing web app running inside an Android container, ready for native SDK integration.

---

### Phase 2: Custom RFID Bridge Plugin

**Goal:** Create a Capacitor plugin to communicate with the Mivanta SDK

Based on the API documentation you provided, we'll build a bridge plugin with:

**Connection Management:**
- Initialize connection to the UHF module when app starts
- Properly disconnect when app closes (prevents battery drain)

**Single Tag Read (Button Mode):**
- Trigger a single read when user taps a button
- Returns one EPC tag immediately
- Perfect for targeted vehicle identification

**Continuous Inventory (Scanning Mode):**
- Start/stop continuous multi-tag scanning
- Real-time callbacks as tags are detected
- Ideal for batch scanning or monitoring

**Power Control:**
- Adjust read power (useful for range control at toll stations)

---

### Phase 3: Web App Integration

**Goal:** Connect the native RFID capabilities to your existing toll workflow

**JavaScript Service Layer:**
- `RfidService.connect()` - Initialize reader on app startup
- `RfidService.readSingle()` - Single button-triggered read
- `RfidService.startContinuous()` / `stopContinuous()` - Inventory mode
- Event listeners for incoming tag data

**Data Flow:**
1. Tag is scanned by handheld reader
2. Mivanta SDK captures EPC data
3. Capacitor plugin passes to JavaScript
4. Your web app receives the tag ID
5. Your app sends to existing API
6. API processes (boom barrier, logging, etc.)

---

### Phase 4: UI Controls

**Goal:** User-friendly controls for the handheld operators

- Mode toggle: Switch between single-read and continuous modes
- Connection status indicator (connected/disconnected)
- Visual feedback when tags are detected
- Power adjustment slider (if needed for range tuning)
- Tag read history/log view

---

### After Implementation: Your Setup Steps

Since native Android code requires local compilation, here's what you'll do:

1. **Export project to GitHub** (using Lovable's export feature)
2. **Clone locally** and open in Android Studio
3. **Add Mivanta SDK files** (the JAR from `CX1500N_Jar_file.zip`) to `android/app/libs/`
4. **Add .so files** to `android/app/src/main/jniLibs/`
5. **Build and deploy** to your CX1500N device
6. **Test** with actual RFID tags

I'll provide detailed step-by-step instructions for each part!

---

### Deliverables

✅ Capacitor project configuration for Android  
✅ Custom `MivantaRfidPlugin` bridging web ↔ native SDK  
✅ JavaScript `RfidService` for your toll app to use  
✅ UI components for reader control  
✅ Complete integration guide with SDK setup steps  
✅ Error handling for connection issues

