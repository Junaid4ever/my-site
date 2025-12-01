import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ZoomAutoJoinProxyProps {
  meetingId: string;
  password: string;
  userName: string;
}

export const ZoomAutoJoinProxy = ({ meetingId, password, userName }: ZoomAutoJoinProxyProps) => {
  const [status, setStatus] = useState('Preparing to join meeting...');

  useEffect(() => {
    const joinUrl = `https://zoom.us/wc/join/${meetingId}?pwd=${password}&uname=${encodeURIComponent(userName)}`;

    const autoJoinScript = `
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
            console.log('✓ Found button via XPath, clicking...');
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
    `;

    const encodedScript = encodeURIComponent(autoJoinScript);
    const bookmarkletUrl = `javascript:(function(){${autoJoinScript}})()`;

    setStatus('Opening Zoom meeting...');

    const newWindow = window.open(joinUrl, '_blank');

    if (newWindow) {
      setTimeout(() => {
        try {
          const script = newWindow.document.createElement('script');
          script.textContent = autoJoinScript;
          newWindow.document.head.appendChild(script);
          setStatus('Auto-join script injected! Meeting should join automatically.');
        } catch (e) {
          console.log('Could not inject script due to CORS. User must use browser extension.');
          setStatus('Meeting opened. Please enable auto-join browser extension if needed.');
        }
      }, 1000);
    }

  }, [meetingId, password, userName]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <h3 className="text-xl font-semibold text-slate-900">Joining Zoom Meeting</h3>
          <p className="text-slate-600">{status}</p>
          <div className="text-sm text-slate-500 mt-4">
            <p>Meeting ID: {meetingId}</p>
            <p>User: {userName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
