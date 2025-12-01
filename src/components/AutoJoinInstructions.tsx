import { Info, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface AutoJoinInstructionsProps {
  isDark: boolean;
}

export function AutoJoinInstructions({ isDark }: AutoJoinInstructionsProps) {
  const [copied, setCopied] = useState(false);

  const bookmarkletCode = `javascript:(function(){const script=document.createElement('script');script.src='${window.location.origin}/zoom-auto-join.js';document.body.appendChild(script);})();`;

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-xl shadow-lg p-4 mb-6 ${
      isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
    }`}>
      <div className="flex items-start gap-3">
        <Info size={20} className={isDark ? 'text-blue-400 mt-0.5' : 'text-blue-600 mt-0.5'} />
        <div className="flex-1">
          <h3 className={`font-semibold text-sm mb-2 ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
            Enable Auto-Join for Zoom Meetings
          </h3>
          <p className={`text-xs mb-3 ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
            For fully automated joining, create a bookmark with this code. Click it when on Zoom's join page to auto-click the join button.
          </p>

          <div className="flex gap-2 items-center">
            <div className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono overflow-x-auto whitespace-nowrap ${
              isDark ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'
            }`}>
              {bookmarkletCode.substring(0, 60)}...
            </div>
            <button
              onClick={copyBookmarklet}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                copied
                  ? 'bg-green-600 text-white'
                  : isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle size={14} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy
                </>
              )}
            </button>
          </div>

          <div className={`mt-3 text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
            <strong>How to use:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1 ml-2">
              <li>Copy the code above</li>
              <li>Create a new bookmark in your browser</li>
              <li>Paste the code as the URL</li>
              <li>Name it "Zoom Auto-Join"</li>
              <li>Click it when you're on a Zoom join page</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
