# PWA Setup Documentation

## Overview
Vision is now configured as a Progressive Web App (PWA) that can be installed on iOS and Android devices. The app runs in fullscreen mode without browser UI elements when added to the home screen.

## Features Implemented

### 1. **Fullscreen Mode**
- ✅ Removed all browser UI (address bar, navigation buttons)
- ✅ iOS status bar is translucent for modern look
- ✅ Safe area padding for notched devices (iPhone X+)
- ✅ Disabled overscroll bounce on iOS
- ✅ Hidden scrollbars in standalone mode

### 2. **Install Prompt**
- ✅ Beautiful modal dialog prompts users to install the app
- ✅ Shows 3 seconds after loading dashboard
- ✅ Respects user dismissal (won't show again for 7 days)
- ✅ Different instructions for iOS vs Android
- ✅ Visual preview of app icon on home screen
- ✅ Lists benefits of installation

### 3. **PWA Configuration**
- ✅ Web app manifest with proper metadata
- ✅ Fullscreen display mode
- ✅ Proper theme colors (black for dark mode)
- ✅ iOS-specific meta tags
- ✅ Shortcuts to dashboard

## Files Modified/Created

### New Files:
- `/public/icon-192.png` - Android PWA icon (192x192)
- `/public/icon-512.png` - Android PWA icon (512x512)
- `/public/apple-touch-icon.png` - iOS home screen icon (180x180)
- `/src/components/ui/install-prompt.tsx` - Install prompt component
- `/scripts/generate-pwa-icons.js` - Icon generation script
- `/scripts/create-pwa-icons.mjs` - PNG placeholder creation
- `PWA_SETUP.md` - This documentation

### Modified Files:
- `/src/app/layout.tsx` - Added iOS meta tags and PWA configuration
- `/src/app/dashboard/layout-client.tsx` - Added install prompt
- `/src/app/globals.css` - Added standalone mode styles and safe area padding
- `/public/site.webmanifest` - Updated to fullscreen display mode

## Important: Replace Placeholder Icons

⚠️ **The current icon files are minimal placeholders.** You need to replace them with your actual branded icons.

### How to Create Proper Icons:

#### Option 1: Use an Online Tool
1. Go to https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload your `light_favicon.ico` file
3. Download the generated icons
4. Replace the files in `/public/`:
   - `icon-192.png`
   - `icon-512.png`
   - `apple-touch-icon.png`

#### Option 2: Use ImageMagick (Command Line)
```bash
# Install ImageMagick
sudo apt-get install imagemagick  # Ubuntu/Debian
brew install imagemagick          # macOS

# Navigate to public directory
cd apps/web/public

# Generate icons from favicon
convert light_favicon.ico -resize 192x192 icon-192.png
convert light_favicon.ico -resize 512x512 icon-512.png
convert light_favicon.ico -resize 180x180 apple-touch-icon.png
```

#### Option 3: Use Figma/Photoshop
1. Open your favicon/logo in your design tool
2. Export at the following sizes:
   - 192x192px → save as `icon-192.png`
   - 512x512px → save as `icon-512.png`
   - 180x180px → save as `apple-touch-icon.png`
3. Place in `/public/` directory

### Icon Requirements:
- **Format**: PNG with transparency
- **Background**: Should work on both light and dark backgrounds
- **Content**: Center your logo/icon with padding (don't go edge-to-edge)
- **Maskable** (optional): For Android adaptive icons, keep important content in the center 80%

## Testing

### iOS Testing:
1. Open Safari on iPhone/iPad
2. Navigate to your site
3. Tap the Share button (bottom middle)
4. Scroll down and tap "Add to Home Screen"
5. Tap "Add"
6. Launch the app from home screen
7. Verify: No Safari UI, fullscreen, proper safe areas

### Android Testing:
1. Open Chrome on Android
2. Navigate to your site
3. You should see an install banner automatically, or
4. Tap the menu (⋮) → "Install app" or "Add to Home screen"
5. Launch the app from home screen
6. Verify: No Chrome UI, fullscreen

### Desktop Testing:
1. Open Chrome/Edge
2. Navigate to your site
3. Look for install icon in address bar
4. Click to install
5. App opens in standalone window

## Customization

### Change App Name
Edit `/public/site.webmanifest`:
```json
{
  "name": "Your Full App Name",
  "short_name": "Short Name",
  ...
}
```

### Change Theme Color
Edit `/public/site.webmanifest` and `/src/app/layout.tsx`:
```json
{
  "theme_color": "#your-color",
  "background_color": "#your-color"
}
```

### Modify Install Prompt Timing
Edit `/src/components/ui/install-prompt.tsx`:
```typescript
// Change the delay (in milliseconds)
setTimeout(() => {
    setShowPrompt(true);
}, 3000); // Currently 3 seconds

// Change the dismissal period (in days)
const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
if (!standalone && daysSinceDismissed > 7) { // Currently 7 days
```

### Disable Install Prompt
If you want to remove the install prompt:
1. Remove `<InstallPrompt />` from `/src/app/dashboard/layout-client.tsx`

## Browser Support

| Feature | iOS Safari | Android Chrome | Desktop Chrome | Desktop Edge |
|---------|-----------|----------------|----------------|--------------|
| Install to Home Screen | ✅ | ✅ | ✅ | ✅ |
| Fullscreen Mode | ✅ | ✅ | ✅ | ✅ |
| Safe Area Insets | ✅ | N/A | N/A | N/A |
| Install Prompt API | ❌ | ✅ | ✅ | ✅ |
| Offline Support | ⚠️ * | ⚠️ * | ⚠️ * | ⚠️ * |

\* Requires service worker implementation (not included yet)

## Next Steps (Optional Enhancements)

### 1. Add Service Worker for Offline Support
- Cache static assets
- Enable offline functionality
- Background sync

### 2. Add Push Notifications
- Implement web push notifications
- Background notification handling

### 3. Add Shortcuts
- Define app shortcuts in manifest
- Quick actions from home screen icon

### 4. Add Share Target
- Allow users to share content to your app

### 5. Create Splash Screens
- Custom loading screens for iOS
- Branded launch experience

## Troubleshooting

### iOS: App Shows Safari UI
- Make sure you added it via "Add to Home Screen" not a bookmark
- Check that `apple-mobile-web-app-capable` meta tag is set to "yes"
- Clear Safari cache and try again

### Android: Can't Install
- Check that your site is served over HTTPS
- Verify manifest.json is accessible at `/site.webmanifest`
- Check browser console for manifest errors

### Icons Not Showing
- Verify icon files exist in `/public/` directory
- Check file names match exactly (case-sensitive)
- Clear browser cache
- Verify icons are valid PNG files

### Install Prompt Not Showing
- Check localStorage for `pwa-install-dismissed` key
- Wait 7 days or clear localStorage
- Check browser console for errors
- iOS doesn't support prompt API (shows instructions instead)

## Additional Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Apple PWA Guidelines](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Google PWA Checklist](https://web.dev/pwa-checklist/)
- [PWA Builder](https://www.pwabuilder.com/)

## Support

For issues or questions about PWA setup:
1. Check browser console for errors
2. Verify all files are in correct locations
3. Test in incognito/private mode
4. Check manifest at `/site.webmanifest`

---

**Last Updated**: October 2025
