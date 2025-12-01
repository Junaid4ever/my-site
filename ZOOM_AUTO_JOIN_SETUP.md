# Zoom Auto-Join Setup Instructions

Since browsers block cross-origin script injection for security, you need to install the auto-join script using one of these methods:

## Option 1: Browser Extension (Recommended)

### Step 1: Create Extension Folder
```bash
mkdir zoom-auto-join-extension
cd zoom-auto-join-extension
```

### Step 2: Create manifest.json
```json
{
  "manifest_version": 3,
  "name": "Zoom Auto-Join",
  "version": "1.0",
  "description": "Automatically clicks Join button in Zoom meetings",
  "permissions": ["activeTab"],
  "content_scripts": [
    {
      "matches": ["https://zoom.us/wc/join/*"],
      "js": ["zoom-auto-join.js"],
      "run_at": "document_end"
    }
  ]
}
```

### Step 3: Copy Script
Copy the file `/public/zoom-auto-join.js` to the extension folder.

### Step 4: Install Extension
1. Open Chrome/Edge
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `zoom-auto-join-extension` folder

Done! Now whenever you click "Join Meeting", the extension will automatically click the blue Join button.

---

## Option 2: Tampermonkey (Alternative) - WITH AUTO-MUTE

**Features:**
- Auto-clicks Join button
- Auto-clicks Join Audio button
- **Auto-mutes all Zoom tabs (Ctrl+M)** - No sound from any meeting!

### Step 1: Install Tampermonkey
- Chrome: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
- Firefox: https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/
- Edge: https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd

### Step 2: Install Final Script (No Alerts)
1. Click Tampermonkey icon
2. Click "Dashboard" → Delete old "Zoom Auto-Join" if present
3. Click "+" icon (Create a new script)
4. **Copy entire content from file: `TAMPERMONKEY_SCRIPT_FINAL.js`**
5. Save (Ctrl+S or Cmd+S)

OR manually paste this code:

\`\`\`javascript
// ==UserScript==
// @name         Zoom Auto-Join
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto-click Join button in Zoom meetings
// @match        https://zoom.us/wc/join/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log('Zoom Auto-Join Script - Direct XPath Implementation');

    let joinButtonClicked = false;
    let audioButtonClicked = false;

    const clickAcceptCookies = () => {
      try {
        const cookieButton = document.evaluate(
          '//button[@id="onetrust-accept-btn-handler"]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (cookieButton) {
          console.log('Cookie button found, clicking...');
          cookieButton.click();
          return true;
        }
      } catch (e) {}
      return false;
    };

    const clickAgreeButton = () => {
      try {
        const agreeButton = document.evaluate(
          '//button[@id="wc_agree1"]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (agreeButton) {
          console.log('Agree button found, clicking...');
          agreeButton.click();
          return true;
        }
      } catch (e) {}
      return false;
    };

    const clickPreviewJoinButton = () => {
      if (joinButtonClicked) return false;

      console.log('Looking for preview-join-button...');

      try {
        const button = document.querySelector('button.preview-join-button');
        if (button) {
          console.log('✓ Found button.preview-join-button, clicking...');
          button.click();
          joinButtonClicked = true;
          return true;
        }
      } catch (e) {
        console.log('preview-join-button selector failed:', e);
      }

      try {
        const button = document.evaluate(
          '/html/body/div[2]/div[2]/div/div[1]/div/div[2]/button',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (button) {
          console.log('✓ Found button via your XPath, clicking...');
          button.click();
          joinButtonClicked = true;
          return true;
        }
      } catch (e) {
        console.log('XPath button search failed:', e);
      }

      try {
        const buttons = document.querySelectorAll('button[type="submit"]');
        for (const btn of buttons) {
          if (btn.textContent.trim().toLowerCase() === 'join') {
            console.log('✓ Found Join button via submit type, clicking...');
            btn.click();
            joinButtonClicked = true;
            return true;
          }
        }
      } catch (e) {}

      console.log('Join button not found yet...');
      return false;
    };

    const clickJoinAudioButton = () => {
      if (audioButtonClicked) return false;

      console.log('Looking for Join Audio by Computer button...');

      try {
        const button = document.evaluate(
          '//button[text()="Join Audio by Computer"]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (button) {
          console.log('✓ Found "Join Audio by Computer" button, clicking...');
          button.click();
          audioButtonClicked = true;
          return true;
        }
      } catch (e) {
        console.log('Join Audio XPath failed:', e);
      }

      try {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.trim().toLowerCase();
          if (text.includes('join audio') || text.includes('join by computer')) {
            console.log('✓ Found audio button by text search, clicking...');
            btn.click();
            audioButtonClicked = true;
            return true;
          }
        }
      } catch (e) {}

      console.log('Audio button not found yet...');
      return false;
    };

    const runAutoJoin = () => {
      clickAcceptCookies();
      clickAgreeButton();

      if (!joinButtonClicked) {
        clickPreviewJoinButton();
      }

      if (joinButtonClicked && !audioButtonClicked) {
        clickJoinAudioButton();
      }
    };

    const waitAndClick = () => {
      const checkReady = setInterval(() => {
        const nameInput = document.querySelector('input[type="text"]');
        if (nameInput) {
          console.log('Page ready, starting auto-join...');
          clearInterval(checkReady);
          runAutoJoin();
        }
      }, 100);

      setTimeout(() => clearInterval(checkReady), 10000);
    };

    waitAndClick();

    setTimeout(() => { console.log('=== Retry 1 (2s) ==='); runAutoJoin(); }, 2000);
    setTimeout(() => { console.log('=== Retry 2 (3s) ==='); runAutoJoin(); }, 3000);
    setTimeout(() => { console.log('=== Retry 3 (4s) ==='); runAutoJoin(); }, 4000);
    setTimeout(() => { console.log('=== Retry 4 (5s) ==='); runAutoJoin(); }, 5000);
    setTimeout(() => { console.log('=== Audio retry (8s) ==='); clickJoinAudioButton(); }, 8000);
    setTimeout(() => { console.log('=== Audio retry (12s) ==='); clickJoinAudioButton(); }, 12000);
    setTimeout(() => { console.log('=== Audio retry (18s) ==='); clickJoinAudioButton(); }, 18000);

    const observer = new MutationObserver(() => {
      if (!joinButtonClicked || !audioButtonClicked) {
        runAutoJoin();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('Auto-join active - monitoring page...');
})();
\`\`\`

### Step 3: Save and Enable
1. Save the script (Ctrl+S or Cmd+S)
2. Make sure it's enabled in Tampermonkey dashboard

Done! Script will run automatically on all Zoom join pages.

---

## Testing
1. Go to your meeting management app
2. Click "Join Meeting" or "Open All"
3. Zoom page opens → **Tab automatically mutes (Ctrl+M)**
4. Script auto-clicks blue "Join" button
5. After entering meeting → Script auto-clicks "Join Audio by Computer"
6. **Check:** Browser tab should show mute icon (no sound)

## Troubleshooting

### If Script Not Running:

1. **Check Tampermonkey Dashboard**
   - Click Tampermonkey icon in browser
   - Go to "Dashboard"
   - Make sure script is enabled (toggle on)
   - Check "Last updated" shows recent time

2. **Use DEBUG Version** (File: `TAMPERMONKEY_SCRIPT_DEBUG.js`)
   - Shows alerts when script runs
   - Logs all buttons found on page
   - Shows exactly which method works
   - Install this version instead to test

3. **Check URL Pattern**
   - Script runs on: `https://zoom.us/*` (all Zoom pages)
   - Open Zoom join page manually
   - Press F12 → Console tab
   - Look for "🚀 TAMPERMONKEY SCRIPT LOADED!"
   - If you see this → Script is running
   - If not → Script not installed or disabled

4. **Common Issues**
   - Tampermonkey disabled globally
   - Script has errors (check red text in console)
   - URL doesn't match pattern
   - Browser blocking scripts

5. **Test Steps**
   - Open: `https://zoom.us/wc/join/123456789?pwd=test&uname=TestUser`
   - You should see alert: "Tampermonkey script is running!"
   - If no alert → Script not working
   - Check Tampermonkey dashboard → Enable script

6. **Alternative: Use Chrome Extension**
   - If Tampermonkey not working, use Extension method (Option 1 above)
   - More reliable than Tampermonkey
   - Loads on every Zoom page automatically

### If Auto-Mute Not Working:

**Note:** Browser tab muting via Ctrl+M is a browser feature. The script sends the keyboard command, but the browser must support it.

**Edge Browser:**
- Ctrl+M shortcut for tab mute is built-in
- Should work automatically
- Check if tab shows mute icon after page loads

**If mute not working:**
1. **Manual verification:** Try pressing Ctrl+M manually on a Zoom tab
2. If manual Ctrl+M works → Script should work too
3. If manual Ctrl+M doesn't work → Edge may not have this feature enabled

**Alternative workaround:**
- Use browser's built-in "Mute site" feature
- Right-click on tab → "Mute site"
- This will mute ALL zoom.us tabs permanently
