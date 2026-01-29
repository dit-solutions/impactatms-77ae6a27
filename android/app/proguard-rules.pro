# Capacitor
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }

# Mivanta RFID SDK - keep all classes
-keep class com.mivanta.** { *; }
-keepclassmembers class com.mivanta.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}
