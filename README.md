# Mira: Re-imagining Web Accessibility through Context-Aware Audio Narration

**Mira** is a chrome extension that uses on-device AI (Gemini Nano) to transform fragmented webpages into coherent, context-aware audio narratives.

> It moves beyond traditional "read-aloud" tools by focusing on *intelligibility*, not just *audibility*. Instead of linearly reading text and isolated alt-text, Mira analyzes the semantic *role* of visual media, weaving its meaning directly into the narration. This preserves the listener's mental flow and makes the web truly understandable as a coherent story.



## ✨ Features

- **🧠 Context-Aware Narration:** Mira doesn't just read alt-text. It uses Chrome's built-in Gemini Prompt and Summarizer APIs to understand an image's *purpose* (e.g., as evidence, contrast, or an example) and integrates its meaning fluently into the surrounding text.
- **🎧 Coherent Listening Experience:** By preserving the narrative flow, Mira reduces the "Split-Attention Effect" and lowers cognitive load, making web content as intelligible to *listen* to as it is to read.
- **🔒 On-Device & Private:** Runs within the browser using Chrome's built-in AI stack. No user data ever leaves your machine.
- **🔊 Natural, Unbroken Audio:** Leverages asynchronous `chrome.tts` buffering to create a seamless, pseudo-streaming narration that feels natural and fluent, without disjointed pauses.
- **🌍 Universal Design:** Built for everyone—from those who *need* it for accessibility (e.g., blind or low-vision users) to those who *prefer* it for multitasking, learning, and audio-first consumption.



## 📋 Prerequisites

- Chrome version >= 138
- Get a [Google ai studio api key](https://aistudio.google.com/api-keys) and input in setting page.
- Hardware (from [here](https://developer.chrome.com/docs/ai/get-started))
  - Operating system: Windows 10 or 11; macOS 13+ (Ventura and onwards); Linux; or ChromeOS (from Platform 16389.0.0 and onwards) on [Chromebook Plus](https://www.google.com/chromebook/chromebookplus/) devices. Chrome for Android, iOS, and ChromeOS on non-Chromebook Plus devices are not yet supported by the APIs which use Gemini Nano.
  - Storage: At least 22 GB of free space on the volume that contains your Chrome profile.Built-in models should be significantly smaller. The exact size may vary slightly with updates.
  - GPU or CPU: Built-in models can run with GPU or CPU.
    - GPU: Strictly more than 4 GB of VRAM.
    - CPU: 16 GB of RAM or more and 4 CPU cores or more.
  - Network: Unlimited data or an unmetered connection.



## 🛠️ Installation

- Open chrome and go to `chrome://flags/#prompt-api-for-gemini-nano` and `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, enabling both flags.

- Build the unpacked extension

  - Build from source: `npm install` and `npm run build` to generate the `dist` directory.

  - Or get the built package from release (`dist.zip`) and extract it.

- Load it in `chrome://extensions/` after enabling Developer mode
- Input your Google AI Studio API key in the settings page



## 💡  Tips

- Reading the page at first may be slow, because it is generating image caption (See in F12 developer panel)
- Previous tab's image caption generation process is killed when switching tabs, so don't worry for high CPU usage!
