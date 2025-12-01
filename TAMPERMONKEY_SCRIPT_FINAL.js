// ==UserScript==
// @name         Zoom Auto-Join + Auto-Mute
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Auto-click Join button and Auto-mute all Zoom tabs (Ctrl+M)
// @match        https://zoom.us/*
// @match        https://*.zoom.us/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('Zoom Auto-Join + Auto-Mute Script Active');

    let joinButtonClicked = false;
    let audioButtonClicked = false;
    let tabMuted = false;

    const muteTab = () => {
      if (tabMuted) return;

      try {
        console.log('Attempting to mute tab with Ctrl+M');

        const event = new KeyboardEvent('keydown', {
          key: 'm',
          code: 'KeyM',
          keyCode: 77,
          which: 77,
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        });

        document.dispatchEvent(event);

        const eventUp = new KeyboardEvent('keyup', {
          key: 'm',
          code: 'KeyM',
          keyCode: 77,
          which: 77,
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        });

        document.dispatchEvent(eventUp);

        tabMuted = true;
        console.log('Tab mute command sent (Ctrl+M)');
      } catch (e) {
        console.log('Mute failed:', e);
      }
    };

    const clickAcceptCookies = () => {
      try {
        const cookieButton = document.getElementById('onetrust-accept-btn-handler');
        if (cookieButton) {
          console.log('Clicking cookie accept button');
          cookieButton.click();
          return true;
        }
      } catch (e) {}
      return false;
    };

    const clickAgreeButton = () => {
      try {
        const agreeButton = document.getElementById('wc_agree1');
        if (agreeButton) {
          console.log('Clicking agree button');
          agreeButton.click();
          return true;
        }
      } catch (e) {}
      return false;
    };

    const clickPreviewJoinButton = () => {
      if (joinButtonClicked) return false;

      try {
        const button = document.querySelector('button.preview-join-button');
        if (button) {
          console.log('Found and clicking Join button');
          button.click();
          joinButtonClicked = true;
          return true;
        }
      } catch (e) {}

      try {
        const button = document.evaluate(
          '/html/body/div[2]/div[2]/div/div[1]/div/div[2]/button',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (button) {
          console.log('Found Join button via XPath');
          button.click();
          joinButtonClicked = true;
          return true;
        }
      } catch (e) {}

      try {
        const buttons = document.querySelectorAll('button[type="submit"]');
        for (const btn of buttons) {
          const text = btn.textContent.trim().toLowerCase();
          if (text === 'join') {
            console.log('Found Join button by text');
            btn.click();
            joinButtonClicked = true;
            return true;
          }
        }
      } catch (e) {}

      return false;
    };

    const clickJoinAudioButton = () => {
      if (audioButtonClicked) return false;

      try {
        const button = document.evaluate(
          '//button[contains(text(), "Join Audio")]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (button) {
          console.log('Clicking Join Audio button');
          button.click();
          audioButtonClicked = true;
          return true;
        }
      } catch (e) {}

      try {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.trim().toLowerCase();
          if (text.includes('join audio') || text.includes('join by computer')) {
            console.log('Found and clicking audio button');
            btn.click();
            audioButtonClicked = true;
            return true;
          }
        }
      } catch (e) {}

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

    const waitForPageReady = () => {
      const checkInterval = setInterval(() => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          clearInterval(checkInterval);
          runAutoJoin();
        }
      }, 500);

      setTimeout(() => clearInterval(checkInterval), 30000);
    };

    // Mute tab immediately when page loads
    muteTab();

    if (document.readyState === 'complete') {
      runAutoJoin();
    } else {
      window.addEventListener('load', () => {
        muteTab();
        setTimeout(runAutoJoin, 1000);
      });
    }

    waitForPageReady();

    // Try muting at different intervals
    setTimeout(() => muteTab(), 1000);
    setTimeout(() => muteTab(), 2000);
    setTimeout(() => muteTab(), 3000);

    setTimeout(() => runAutoJoin(), 3000);
    setTimeout(() => runAutoJoin(), 5000);
    setTimeout(() => runAutoJoin(), 7000);
    setTimeout(() => runAutoJoin(), 10000);
    setTimeout(() => clickJoinAudioButton(), 15000);
    setTimeout(() => clickJoinAudioButton(), 20000);

    const observer = new MutationObserver(() => {
      if (!joinButtonClicked || !audioButtonClicked) {
        runAutoJoin();
      }
    });

    setTimeout(() => {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }, 2000);

    console.log('Zoom Auto-Join + Auto-Mute initialized - monitoring for buttons');
    console.log('Note: Ctrl+M mute works only if Edge browser has this shortcut enabled');
})();
