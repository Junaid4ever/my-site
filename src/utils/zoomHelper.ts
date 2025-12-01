export interface ZoomMeetingConfig {
  meetingId: string;
  password: string;
  meetingName: string;
  userName?: string;
}

export const generateZoomJoinUrl = (config: ZoomMeetingConfig): string => {
  const { meetingId, password, meetingName, userName = 'User' } = config;

  const params = new URLSearchParams({
    pwd: password,
    uname: userName,
  });

  return `https://zoom.us/wc/join/${meetingId}?${params.toString()}`;
};

export const joinZoomMeeting = async (config: ZoomMeetingConfig): Promise<void> => {
  const joinUrl = generateZoomJoinUrl(config);

  const newWindow = window.open(joinUrl, '_blank');

  if (newWindow) {
    const autoJoinScript = document.createElement('script');
    autoJoinScript.src = '/zoom-auto-join.js';

    setTimeout(() => {
      try {
        newWindow.document.head.appendChild(autoJoinScript);
        console.log('Auto-join script injected successfully');
      } catch (e) {
        console.log('Could not inject script due to browser security (CORS). Script will load via page.');
      }
    }, 500);
  }
};

export const validateZoomCredentials = (meetingId: string, password: string): {
  isValid: boolean;
  message: string;
} => {
  const cleanId = meetingId.replace(/\s/g, '');

  if (!cleanId || !password) {
    return {
      isValid: false,
      message: 'Meeting ID and password are required'
    };
  }

  if (cleanId.length < 9 || cleanId.length > 11) {
    return {
      isValid: false,
      message: 'Meeting ID must be 9-11 digits'
    };
  }

  if (!/^\d+$/.test(cleanId)) {
    return {
      isValid: false,
      message: 'Meeting ID must contain only numbers'
    };
  }

  if (password.length < 1) {
    return {
      isValid: false,
      message: 'Password is required'
    };
  }

  return {
    isValid: true,
    message: 'Meeting credentials are valid'
  };
};
