// ==UserScript==
// @name         Zoom Auto-Join DEBUG
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Auto-click Join button in Zoom meetings with DEBUG logs
// @match        https://zoom.us/*
// @match        https://*.zoom.us/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('🚀 TAMPERMONKEY SCRIPT LOADED! URL:', window.location.href);
    alert('Tampermonkey script is running on this page!');

    let joinButtonClicked = false;
    let audioButtonClicked = false;
    let attemptNumber = 0;

    const clickAcceptCookies = () => {
      try {
        const cookieButton = document.getElementById('onetrust-accept-btn-handler');
        if (cookieButton) {
          console.log('✅ Cookie button found, clicking...');
          cookieButton.click();
          return true;
        }
      } catch (e) {
        console.log('❌ Cookie button error:', e);
      }
      return false;
    };

    const clickAgreeButton = () => {
      try {
        const agreeButton = document.getElementById('wc_agree1');
        if (agreeButton) {
          console.log('✅ Agree button found, clicking...');
          agreeButton.click();
          return true;
        }
      } catch (e) {
        console.log('❌ Agree button error:', e);
      }
      return false;
    };

    const clickPreviewJoinButton = () => {
      if (joinButtonClicked) {
        console.log('⏭️ Join button already clicked, skipping...');
        return false;
      }

      attemptNumber++;
      console.log(`🔍 Attempt #${attemptNumber} - Looking for Join button...`);

      // Debug: Show all buttons on page
      const allButtons = document.querySelectorAll('button');
      console.log(`📊 Total buttons found: ${allButtons.length}`);

      allButtons.forEach((btn, index) => {
        console.log(`Button ${index}:`, {
          text: btn.textContent.trim(),
          class: btn.className,
          type: btn.type,
          id: btn.id
        });
      });

      // Method 1: button.preview-join-button
      try {
        const button = document.querySelector('button.preview-join-button');
        if (button) {
          console.log('✅ SUCCESS! Found button.preview-join-button');
          console.log('Button details:', button);
          button.click();
          joinButtonClicked = true;
          alert('Clicked Join button via .preview-join-button!');
          return true;
        } else {
          console.log('❌ button.preview-join-button not found');
        }
      } catch (e) {
        console.log('❌ preview-join-button error:', e);
      }

      // Method 2: Your exact XPath
      try {
        const button = document.evaluate(
          '/html/body/div[2]/div[2]/div/div[1]/div/div[2]/button',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (button) {
          console.log('✅ SUCCESS! Found button via XPath');
          console.log('Button details:', button);
          button.click();
          joinButtonClicked = true;
          alert('Clicked Join button via XPath!');
          return true;
        } else {
          console.log('❌ XPath button not found');
        }
      } catch (e) {
        console.log('❌ XPath error:', e);
      }

      // Method 3: Search by text "Join"
      try {
        for (const btn of allButtons) {
          const text = btn.textContent.trim().toLowerCase();
          if (text === 'join' && btn.type === 'submit') {
            console.log('✅ SUCCESS! Found Join button by text');
            console.log('Button details:', btn);
            btn.click();
            joinButtonClicked = true;
            alert('Clicked Join button by text search!');
            return true;
          }
        }
        console.log('❌ No button with text "Join" found');
      } catch (e) {
        console.log('❌ Text search error:', e);
      }

      console.log('❌ Join button NOT found in this attempt');
      return false;
    };

    const clickJoinAudioButton = () => {
      if (audioButtonClicked) return false;

      console.log('🔊 Looking for Join Audio button...');

      const allButtons = document.querySelectorAll('button');
      console.log(`🔊 Scanning ${allButtons.length} buttons for audio...`);

      try {
        const button = document.evaluate(
          '//button[contains(text(), "Join Audio")]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (button) {
          console.log('✅ Found audio button!');
          button.click();
          audioButtonClicked = true;
          return true;
        }
      } catch (e) {
        console.log('❌ Audio button XPath error:', e);
      }

      for (const btn of allButtons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text.includes('join audio') || text.includes('join by computer')) {
          console.log('✅ Found audio button by text!');
          btn.click();
          audioButtonClicked = true;
          return true;
        }
      }

      console.log('❌ Audio button not found');
      return false;
    };

    const runAutoJoin = () => {
      console.log('🎯 Running auto-join sequence...');
      clickAcceptCookies();
      clickAgreeButton();

      if (!joinButtonClicked) {
        clickPreviewJoinButton();
      }

      if (joinButtonClicked && !audioButtonClicked) {
        clickJoinAudioButton();
      }
    };

    // Wait for page load
    const waitForPageReady = () => {
      console.log('⏳ Waiting for page to be ready...');

      const checkInterval = setInterval(() => {
        console.log('🔄 Checking if page is ready...', document.readyState);

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          console.log('✅ Page is ready! Starting auto-join...');
          clearInterval(checkInterval);
          runAutoJoin();
        }
      }, 500);

      setTimeout(() => {
        console.log('⏰ Timeout reached, stopping checks');
        clearInterval(checkInterval);
      }, 30000);
    };

    // Start immediately
    if (document.readyState === 'complete') {
      console.log('✅ Document already loaded, starting now...');
      runAutoJoin();
    } else {
      console.log('⏳ Document still loading, waiting...');
      window.addEventListener('load', () => {
        console.log('✅ Window loaded event fired!');
        setTimeout(runAutoJoin, 1000);
      });
    }

    waitForPageReady();

    // Aggressive retries
    setTimeout(() => { console.log('🔄 Retry 1 (3s)'); runAutoJoin(); }, 3000);
    setTimeout(() => { console.log('🔄 Retry 2 (5s)'); runAutoJoin(); }, 5000);
    setTimeout(() => { console.log('🔄 Retry 3 (7s)'); runAutoJoin(); }, 7000);
    setTimeout(() => { console.log('🔄 Retry 4 (10s)'); runAutoJoin(); }, 10000);
    setTimeout(() => { console.log('🔊 Audio retry (15s)'); clickJoinAudioButton(); }, 15000);
    setTimeout(() => { console.log('🔊 Audio retry (20s)'); clickJoinAudioButton(); }, 20000);

    // Watch for DOM changes
    const observer = new MutationObserver(() => {
      if (!joinButtonClicked || !audioButtonClicked) {
        runAutoJoin();
      }
    });

    setTimeout(() => {
      console.log('👁️ Starting DOM observer...');
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }, 2000);

    console.log('✅ Tampermonkey script fully initialized!');
})();
