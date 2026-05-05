# EAS Deployment Guide - ABUTutors Connect

This guide covers the steps to build and deploy the mobile application using Expo Application Services (EAS).

## 1. Prerequisites
- [Expo Account](https://expo.dev/signup)
- EAS CLI installed: `npm install -g eas-cli`

## 2. Initial Setup
Run this command once to link the project to your Expo account:
```bash
npx eas-cli@latest init --id fe635923-f1ea-4b5f-979e-9ee4611c10be
```

## 3. Pre-Build Configuration
**IMPORTANT:** Before building for production, ensure the app points to the live backend.
- Open `mobile/constants/Config.ts`
- Set `const IS_PRODUCTION = true;`

## 4. Build Commands

### Create Android APK (For Testing)
This generates an installable `.apk` file for Android devices.
```bash
eas build -p android --profile preview
```

### Create iOS Build (Internal Testing)
```bash
eas build -p ios --profile preview
```

### Create Production Builds (App Stores)
```bash
# Android (AAB format for Play Store)
eas build -p android --profile production

# iOS (For App Store)
eas build -p ios --profile production

# All Platforms
eas build --platform all
```

## 5. Useful Commands
- **Check Build Status:** `eas build:list`
- **View Specific Build:** `eas build:view`
- **Login to Expo:** `eas login`
- **Configure Credentials:** `eas build:configure`

## 6. Submission (Optional)
To submit a completed build to the stores automatically:
```bash
eas submit -p android --latest
eas submit -p ios --latest
```
