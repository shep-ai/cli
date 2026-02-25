/**
 * Playwright fixture: In-browser audio recording + video merge
 *
 * Captures all HTMLAudioElement output by monkey-patching play() to route
 * audio through Web Audio API → MediaStreamDestination → MediaRecorder.
 *
 * After the test:
 *   1. Extracts the recorded audio as a WebM blob from the page
 *   2. Saves Playwright's video-only recording
 *   3. Merges them with ffmpeg into a single WebM with both tracks
 *   4. Attaches the result to the Playwright HTML report
 *
 * Requires: `video: 'on'` in Playwright config and ffmpeg on PATH.
 * Without ffmpeg the audio and video are attached separately.
 *
 * Usage:
 *   import { test, expect } from './fixtures/audio-recording';
 *   // Every test using this `test` automatically gets audio recording.
 */

import { test as base } from '@playwright/test';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Init script injected into the page BEFORE any application JS runs.
//
// It monkey-patches HTMLAudioElement.prototype.play so that every Audio
// element's output is tee'd into a MediaRecorder via the Web Audio API.
// The original playback is preserved (speakers still work).
// ---------------------------------------------------------------------------

const AUDIO_CAPTURE_INIT_SCRIPT = `
(() => {
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const recorder = new MediaRecorder(dest.stream, {
    mimeType: 'audio/webm;codecs=opus',
  });
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // Track elements already routed so createMediaElementSource is called once.
  const connected = new WeakSet();

  const origPlay = HTMLAudioElement.prototype.play;
  HTMLAudioElement.prototype.play = function () {
    if (!connected.has(this)) {
      try {
        const source = audioCtx.createMediaElementSource(this);
        source.connect(dest);                // → MediaRecorder
        source.connect(audioCtx.destination); // → speakers (keep audible)
        connected.add(this);
      } catch {
        // Element already has a source node, or CORS — fall through
      }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return origPlay.call(this);
  };

  // Start recording immediately (silence is fine — it compresses well).
  recorder.start(100);

  // Playwright calls this in the fixture teardown to retrieve the recording.
  window.__stopAudioRecording = () =>
    new Promise((resolve) => {
      if (recorder.state !== 'recording') {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      };
      recorder.stop();
    });
})();
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ffmpegAvailable(): boolean {
  try {
    execSync('which ffmpeg', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Extended test with automatic audio recording
// ---------------------------------------------------------------------------

export const test = base.extend<{ audioRecording: void }>({
  audioRecording: [
    async ({ page }, use, testInfo) => {
      // Setup: inject the audio capture monkey-patch before any navigation
      await page.addInitScript(AUDIO_CAPTURE_INIT_SCRIPT);

      // ---- test body runs ----
      await use();

      // Teardown: extract audio, merge with Playwright video
      try {
        // 1. Pull the recorded audio out of the browser
        const audioDataUrl = await page.evaluate(
          () =>
            (
              window as unknown as { __stopAudioRecording?: () => Promise<string | null> }
            ).__stopAudioRecording?.() ?? null
        );

        if (!audioDataUrl) return;
        const base64 = audioDataUrl.split(',')[1];
        if (!base64) return;

        const audioPath = path.join(testInfo.outputDir, 'audio.webm');
        fs.mkdirSync(testInfo.outputDir, { recursive: true });
        fs.writeFileSync(audioPath, Buffer.from(base64, 'base64'));

        // 2. Close the page so Playwright finalises its video file
        await page.close();

        const video = page.video();
        if (!video) {
          await testInfo.attach('audio-recording', {
            path: audioPath,
            contentType: 'audio/webm',
          });
          return;
        }

        // 3. Save the finalised video to a known path
        const videoPath = path.join(testInfo.outputDir, 'video-only.webm');
        await video.saveAs(videoPath);

        // 4. Merge video + audio with ffmpeg
        if (ffmpegAvailable()) {
          const outputPath = path.join(testInfo.outputDir, 'recording-with-audio.webm');
          execSync(
            `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -map 0:v -map 1:a -c:v copy -c:a copy "${outputPath}"`,
            { timeout: 30_000, stdio: 'ignore' }
          );

          await testInfo.attach('recording-with-audio', {
            path: outputPath,
            contentType: 'video/webm',
          });
        } else {
          // No ffmpeg — attach video and audio separately
          await testInfo.attach('video-only', {
            path: videoPath,
            contentType: 'video/webm',
          });
          await testInfo.attach('audio-recording', {
            path: audioPath,
            contentType: 'audio/webm',
          });

          console.warn(
            '[audio-recording] ffmpeg not found — video and audio attached separately.\n' +
              'Install ffmpeg (`brew install ffmpeg`) to get a merged recording.'
          );
        }
      } catch (err) {
        // Never fail a test because of recording issues

        console.warn('[audio-recording] Failed to extract/merge audio:', err);
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
