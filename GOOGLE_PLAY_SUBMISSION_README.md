# Google Play Store Submission Guide

## 📋 Pre-Submission Checklist

### ✅ Configuration Updates (COMPLETED)
- [x] Android package name configured: `app.rork.farmseed_mapper`
- [x] Version code starts at 1 and auto-increments
- [x] EAS build configured for AAB (Android App Bundle)
- [x] Build type set to "app-bundle" for Google Play Store

### 🎨 Required Assets (YOU NEED TO PROVIDE)

#### App Icons & Graphics
Place these files in the `assets/images/` directory:

1. **App Icon** (`icon.png`)
   - Size: 1024x1024px
   - Format: PNG
   - Background: Transparent or white

2. **Adaptive Icon Foreground** (`adaptive-icon.png`)
   - Size: 108x108px (safe zone: 66x66px)
   - Format: PNG
   - Transparent background

3. **Splash Screen Icon** (`splash-icon.png`)
   - Size: 512x512px recommended
   - Format: PNG
   - Will be centered on white background

4. **Favicon** (`favicon.png`)
   - Size: 48x48px
   - Format: PNG

#### Store Listing Screenshots
You'll need 2-8 screenshots for Google Play Store:
- **Phone screenshots**: 1080x1920px (9:16 aspect ratio)
- **Tablet screenshots** (optional): 1200x1920px (5:8 aspect ratio)
- Format: PNG or JPEG (PNG recommended)

### 🔑 Required Configuration Files

#### 1. Google Service Account Key (for EAS Submit)
- File: `google-service-account-key.json`
- Place in project root
- Create at: Google Cloud Console → IAM & Admin → Service Accounts
- Required permissions: Google Play Android Developer API

**Note**: No `google-services.json` file needed as the app uses Supabase for backend services, not Firebase.

#### 2. Google Service Account Key (for EAS Submit)
- File: `google-service-account-key.json`
- Place in project root
- Create at: Google Cloud Console → IAM & Admin → Service Accounts
- Required permissions: Google Play Android Developer API

### 🏗️ Build & Test Commands

#### 1. Build Android App Bundle (AAB)
```bash
# First build will use versionCode 1
eas build --platform android --profile production

# Subsequent builds will auto-increment: 2, 3, 4, etc.
eas build --platform android --profile production
```

#### 2. Test Internal Release
```bash
eas submit --platform android --profile production
```

#### 3. Verify Build Configuration
```bash
npx expo config --json
eas build:configure
```

### 📝 Google Play Store Listing Information

#### App Details
- **App Name**: FarmSeed Mapper
- **Short Description** (80 chars): Precision farming app for seed tracking and field management
- **Full Description**: Use the update summary from the previous section
- **Category**: Productivity or Business
- **Content Rating**: Everyone

#### Store Listing Assets
- **Feature Graphic**: 1024x500px
- **Promo Graphic** (optional): 180x120px
- **YouTube Video** (optional): Link to demo video

### 🔒 Permissions & Privacy Policy

#### Required Permissions (Already Configured)
- Location (coarse & fine)
- Camera
- Storage (read/write)
- Microphone
- Internet
- Vibration

#### Privacy Policy
You'll need a privacy policy that covers:
- Data collection and storage
- Location data usage
- Photo storage
- Farm data sharing (if applicable)

### 🚀 Submission Steps

1. **Build the app**:
   ```bash
   eas build --platform android --profile production
   ```

2. **Test on device** (download from EAS build URL)

3. **Update store listing**:
   - Title, description, screenshots
   - Privacy policy URL
   - Contact information

4. **Submit for review**:
   ```bash
   eas submit --platform android --profile production
   ```

### 📞 Contact Information Required

For Google Play Store, you need:
- Developer name and contact
- Support email
- Privacy policy URL
- Website (optional)

### ⚠️ Important Notes

1. **First Release**: May take 1-3 days for review
2. **AAB Format**: Required for new apps since August 2021
3. **64-bit Requirement**: Already handled by Expo/React Native
4. **API Level**: Minimum 21 (Android 5.0) - already configured
5. **Version Code**: Starts at 1 and auto-increments with each build (1, 2, 3, etc.)

### 🆘 Troubleshooting

- **Build fails**: Check `eas build:inspect` for configuration issues
- **Missing assets**: Ensure all required image files are present
- **Permission issues**: Verify Google Play Console API access
- **AAB vs APK**: Google Play Store requires AAB format

### 📋 Final Checklist Before Submission

- [ ] All app assets created and placed in `assets/images/`
- [ ] Google Service Account key for EAS submission to Play Store
- [ ] Privacy policy published and URL ready
- [ ] Store listing screenshots prepared
- [ ] App tested on physical Android device
- [ ] Build successful with EAS
- [ ] Google Play Console account set up
- [ ] App details entered in Play Console

---

**Next Steps**: Once you've prepared all the required assets and configuration files, run the build command and follow the submission process!