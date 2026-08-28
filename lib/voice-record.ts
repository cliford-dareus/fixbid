/**
 * Voice capture for Voice-to-quote.
 * Uses expo-av when available; falls back to web SpeechRecognition on web.
 */
import {Platform} from 'react-native';

export type VoiceRecordingResult = {
  /** Base64 audio without data: prefix (native path). */
  audioBase64?: string;
  audioMime?: string;
  /** Transcript when using web speech API. */
  transcript?: string;
};

type RecordingHandle = {
  stopAndGetResult: () => Promise<VoiceRecordingResult>;
  cancel: () => Promise<void>;
};

let AudioModule: typeof import('expo-av').Audio | null = null;

async function loadExpoAv(): Promise<typeof import('expo-av').Audio | null> {
  if (AudioModule) return AudioModule;
  try {
    const mod = await import('expo-av');
    AudioModule = mod.Audio;
    return AudioModule;
  } catch {
    return null;
  }
}

/**
 * Start a voice recording (native) or live speech recognition (web).
 */
export async function startVoiceCapture(): Promise<RecordingHandle> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return startWebSpeech();
  }

  const Audio = await loadExpoAv();
  if (!Audio) {
    throw new Error(
      'Voice recording requires expo-av. Run: npx expo install expo-av',
    );
  }

  const permission = await Audio.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Microphone permission is required for voice-to-quote');
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync({
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
    android: {
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
      extension: '.m4a',
      outputFormat: Audio.AndroidOutputFormat.MPEG_4,
      audioEncoder: Audio.AndroidAudioEncoder.AAC,
    },
    ios: {
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
      extension: '.m4a',
      outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    },
  });
  await recording.startAsync();

  return {
    async stopAndGetResult() {
      try {
        await recording.stopAndUnloadAsync();
      } catch {
        // already stopped
      }
      const uri = recording.getURI();
      if (!uri) throw new Error('No recording captured');

      const base64 = await uriToBase64(uri);
      await Audio.setAudioModeAsync({allowsRecordingIOS: false});
      return {
        audioBase64: base64,
        audioMime: 'audio/m4a',
      };
    },
    async cancel() {
      try {
        await recording.stopAndUnloadAsync();
      } catch {
        /* ignore */
      }
      await Audio.setAudioModeAsync({allowsRecordingIOS: false});
    },
  };
}

async function uriToBase64(uri: string): Promise<string> {
  try {
    const FS = await import('expo-file-system');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const EncodingType = (FS as any).EncodingType || (FS as any).FileSystem?.EncodingType;
    if (FS.readAsStringAsync) {
      const b64 = await FS.readAsStringAsync(uri, {
        encoding: EncodingType?.Base64 || 'base64',
      });
      return b64;
    }
  } catch {
    /* fall through */
  }

  const res = await fetch(uri);
  const blob = await res.blob();
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function startWebSpeech(): RecordingHandle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    throw new Error('Speech recognition is not supported in this browser');
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let finalTranscript = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript as string;
      if (event.results[i].isFinal) finalTranscript += text + ' ';
    }
  };

  recognition.start();

  return {
    async stopAndGetResult() {
      return new Promise((resolve, reject) => {
        recognition.onerror = (e: {error?: string}) => {
          reject(new Error(e.error || 'Speech recognition failed'));
        };
        recognition.onend = () => {
          const transcript = finalTranscript.trim();
          if (!transcript) {
            reject(new Error('No speech detected — try again'));
            return;
          }
          resolve({transcript});
        };
        try {
          recognition.stop();
        } catch {
          reject(new Error('Could not stop recognition'));
        }
      });
    },
    async cancel() {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    },
  };
}
