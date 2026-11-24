J.A.R.V.I.S MOBILE — STAGE 1 (PWA FOUNDATION)
================================================

WHAT THIS BUILD DOES
- Installable PWA shell (when served over HTTPS or localhost)
- Futuristic assistant dashboard
- Browser speech recognition, where supported
- English (India) and Telugu recognition language selection
- Foreground "Hey Jarvis" wake phrase prototype
- Spoken responses using browser text-to-speech
- Local notes and small chat history using localStorage
- 15 tool categories from the supplied Episode 06 guide:
  time, weather, timer, dice/coin, joke, quote, tech news, Telugu translation,
  currency, word meaning, password generation, Wikipedia, app/web opening,
  YouTube search, Bitcoin price
- Offline app shell caching after first successful load

IMPORTANT LIMITATIONS
1. This is a PWA/browser prototype, not a native Android APK.
2. Wake listening only works while the app/browser is open and foregrounded.
   It is NOT always-on with the screen locked and is NOT a background microphone service.
3. Web Speech recognition availability depends on browser, Android version,
   language pack, network, and browser policy. Telugu recognition may not be
   available on every device.
4. Most live-information tools need internet. Weather needs location permission.
5. No Gemini API key is included. This Stage 1 build is zero-cost and uses
   deterministic commands/free public endpoints. It is not a general AI chatbot.
6. Local notes are stored in browser storage on this device. Clearing site data
   can erase them. Do not store passwords or sensitive information in notes.
7. A generated password is displayed aloud by default. Avoid using that feature
   in public or around other people; a future version should display it privately.

HOW TO TEST
- Do not test PWA installation by opening index.html as file://.
- Use an HTTPS static host (GitHub Pages is suitable) or localhost.
- Upload every file in this folder to the same published directory.
- Open the HTTPS site in Chrome on Android.
- Allow microphone permission when asked.
- Tap ENABLE WAKE MODE; say "Hey Jarvis"; wait for "Yes, how can I help?";
  then say a command.
- For one-shot speech, tap SPEAK COMMAND.
- Use STOP to end listening.
- For installation, Chrome menu > Install app / Add to Home screen.

SUGGESTED TEST COMMANDS
"What is the time?"
"What is the weather?"
"Set a timer for 1 minute"
"Tell me a joke"
"Give me a daily quote"
"Translate hello to Telugu"
"Play Telugu songs"
"Wikipedia search solar system"
"Convert 10 USD to INR"
"What is Bitcoin price?"
"Generate a password"

PRIVACY
- No audio recording is uploaded by this app code intentionally.
- Browser speech recognition may be processed by the browser's speech service;
  review your browser/provider privacy settings.
- Weather uses geolocation only after the browser asks for permission.
- Third-party public APIs receive the query needed for the requested tool.

FILES
index.html  Main app interface
style.css   Visual design
app.js      Voice engine, wake-word state, local memory and tool router
manifest.json PWA identity and install metadata
sw.js       Offline shell cache
icon.svg    App icon
