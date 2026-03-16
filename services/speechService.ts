export class SpeechRecognitionService {
  recognition: any;
  isListening: boolean = false;
  shouldBeListening: boolean = false;
  
  constructor(
    onResult: (text: string, isFinal: boolean) => void,
    onEnd: () => void,
    lang: 'en' | 'hi' = 'en'
  ) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error("Browser does not support Web Speech API");
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = lang === 'en' ? 'en-US' : 'hi-IN';

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      const trimmedTranscript = finalTranscript.trim();
      if (trimmedTranscript) {
        onResult(trimmedTranscript, true);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'no-speech') {
        // Just ignore no-speech, it will trigger onend and we can restart if needed
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // For lectures, we want to keep listening even if the browser stops us
      // unless the user explicitly stopped it.
      if (this.shouldBeListening) {
        console.log("Speech recognition ended unexpectedly, restarting...");
        this.start();
      } else {
        onEnd();
      }
    };
  }

  start() {
    this.shouldBeListening = true;
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
      } catch (e) {
        console.error("Error starting recognition", e);
      }
    }
  }

  stop() {
    this.shouldBeListening = false;
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  updateLang(lang: 'en' | 'hi') {
    if (this.recognition) {
        const wasListening = this.shouldBeListening;
        this.stop();
        this.recognition.lang = lang === 'en' ? 'en-US' : 'hi-IN';
        if (wasListening) {
          setTimeout(() => this.start(), 300);
        }
    }
  }
}
