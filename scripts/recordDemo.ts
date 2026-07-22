import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "demo-recordings");

async function recordDemo() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log("[00:00] Launching browser and starting video recording...");
  const browser = await chromium.launch({ headless: true }); // can be false for local testing
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: OUT_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  // Using the deployed URL
  const URL = "https://eco-times.vercel.app";

  try {
    console.log(`[00:05] Navigating to ${URL}/command-center...`);
    await page.goto(`${URL}/command-center`);
    
    // Wait for entrance animations (simulates letting the entrance beat land 0:00-0:35)
    await page.waitForTimeout(5000);

    console.log("[00:10] Clicking Reset Demo Data...");
    // Find and click the Reset Demo button
    const resetButton = page.locator('button:has-text("Reset Demo Data"), button:has-text("Reset Demo")');
    await resetButton.click();
    
    // Wait for toast or confirmation logic
    await page.waitForTimeout(3000);

    console.log("[00:15] Clicking Run Live Scenario...");
    const runButton = page.locator('button:has-text("Run Live Scenario")');
    await runButton.click();

    console.log("[00:20] Waiting for scenario to play out (approx 45 seconds)...");
    
    // The scenario chunks arrive every ~3-4 seconds. We wait to let them populate.
    // Periodically simulating a hover over the reasoning icon.
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(10000);
      
      // Try to hover over a reasoning badge if it exists
      try {
        const reasoningIcons = page.locator('.lucide-brain').first();
        if (await reasoningIcons.isVisible()) {
          await reasoningIcons.hover();
        }
      } catch (e) {
        // ignore hover errors
      }
    }

    console.log("[01:00] Scrolling to Impact Metrics panel...");
    // Attempt to scroll to metrics
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(3000);

    console.log("[01:05] Checking for Evidence Package PDF button...");
    const pdfButton = page.locator('button:has-text("Download PDF")').first();
    if (await pdfButton.isVisible()) {
      // We don't click it to avoid interrupting the video context with a download prompt, 
      // but we hover it to show it's interactive.
      await pdfButton.hover();
      await page.waitForTimeout(2000);
    }

    console.log("[01:10] Navigating to /shield...");
    await page.goto(`${URL}/shield`);
    await page.waitForTimeout(2000);

    console.log("[01:15] Typing a realistic citizen message...");
    const input = page.locator('textarea, input[type="text"]').first();
    if (await input.isVisible()) {
      const msg = "someone called claiming to be from customs and said I need to pay a fine immediately or I'll be arrested";
      await input.fill(msg);
      await page.waitForTimeout(1000);
      
      const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
      await sendButton.click();
      
      console.log("[01:20] Waiting for Shield response...");
      await page.waitForTimeout(10000);
    }

    console.log("[01:30] Run complete. Closing browser to finalize video.");
  } catch (error) {
    console.error("Error during automated run:", error);
  } finally {
    await context.close(); // Important: closes the context and saves the video
    await browser.close();

    // The video is saved with a random string name. Let's find and rename it.
    const files = fs.readdirSync(OUT_DIR);
    const webmFile = files.find(f => f.endsWith(".webm") && f !== "live-run.webm");
    
    if (webmFile) {
      const oldPath = path.join(OUT_DIR, webmFile);
      const newPath = path.join(OUT_DIR, "live-run.webm");
      
      if (fs.existsSync(newPath)) {
         fs.unlinkSync(newPath); // delete old run if it exists
      }
      fs.renameSync(oldPath, newPath);
      console.log(`\n✅ Recording successfully saved to: ${newPath}`);
    } else {
      console.log("\n⚠️ Video file might not have generated correctly.");
    }
  }
}

recordDemo();
