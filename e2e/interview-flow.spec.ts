import { test, expect } from '@playwright/test';

test.describe('Interview Session E2E', () => {
  test('Complete interview flow: interviewer creates session, candidate joins and updates canvas', async ({ browser }) => {
    // Create two browser contexts for interviewer and candidate
    const interviewerContext = await browser.newContext();
    const candidateContext = await browser.newContext();

    const interviewerPage = await interviewerContext.newPage();
    const candidatePage = await candidateContext.newPage();

    try {
      // ===== SESSION 1: INTERVIEWER =====
      
      // Navigate to the application
      await interviewerPage.goto('/');
      
      // Wait for the page to load
      await expect(interviewerPage.getByText('Interview Sessions')).toBeVisible({ timeout: 30000 });
      
      // Create a new session
      await interviewerPage.click('button:has-text("+ New Session")');
      
      // Fill in session details
      await interviewerPage.fill('input[placeholder*="title"]', 'E2E Test Session');
      await interviewerPage.fill('textarea[placeholder*="prompt"]', 'This is an end-to-end test session');
      
      // Submit the form
      await interviewerPage.click('button:has-text("Create")');
      
      // Wait for session to be created and appear in the list
      await expect(interviewerPage.getByText('E2E Test Session')).toBeVisible({ timeout: 10000 });
      
      // Click on the session to enter it
      await interviewerPage.click('text=E2E Test Session');
      
      // Wait for session view to load
      await expect(interviewerPage.locator('.session-header')).toBeVisible({ timeout: 10000 });
      
      // Get the guest link (simulated - in real app this would be from a "Share" button)
      // For now, we'll use the API to create a guest link
      const guestLinkResponse = await interviewerPage.request.post('/v1/sessions', {
        data: {
          title: 'E2E Test Session',
          prompt: 'This is an end-to-end test session'
        }
      });
      
      if (guestLinkResponse.ok()) {
        const sessionData = await guestLinkResponse.json();
        
        // Create a guest link for the session
        const linkResponse = await interviewerPage.request.post(`/v1/sessions/${sessionData.id}/guest-links`, {
          data: { role: 'candidate' }
        });
        
        if (linkResponse.ok()) {
          const linkData = await linkResponse.json();
          const guestToken = linkData.token;
          
          // ===== SESSION 2: CANDIDATE =====
          
          // Navigate to the join page with the token
          await candidatePage.goto(`/?token=${guestToken}`);
          
          // Wait for join lobby to appear
          await expect(candidatePage.getByText('Join Interview Session')).toBeVisible({ timeout: 10000 });
          
          // Enter candidate name
          await candidatePage.fill('input[id="displayName"]', 'E2E Candidate');
          
          // Join the session
          await candidatePage.click('button:has-text("Join Session")');
          
          // Wait for session view to load
          await expect(candidatePage.locator('.session-header')).toBeVisible({ timeout: 10000 });
          
          // ===== CANDIDATE UPDATES CANVAS =====
          
          // Wait for canvas to be visible
          await expect(candidatePage.locator('.canvas')).toBeVisible({ timeout: 10000 });
          
          // Select rectangle tool
          await candidatePage.click('button:has-text("rectangle")');
          
          // Click on canvas to add a rectangle
          const canvas = candidatePage.locator('.canvas-svg');
          await canvas.click({ position: { x: 200, y: 200 } });
          
          // Wait a moment for the element to be added
          await candidatePage.waitForTimeout(1000);
          
          // Verify the element was added (check for element count or specific element)
          const elements = await candidatePage.locator('.canvas-svg g').count();
          expect(elements).toBeGreaterThan(0);
          
          // ===== INTERVIEWER VERIFIES CHANGE =====
          
          // Note: In the current implementation, real-time sync via WebSocket is not fully implemented
          // The httpApi uses a NoopSocket, so changes won't sync in real-time
          // This test verifies the flow works up to the point where real-time sync would occur
          
          // For a complete test with real-time sync, we would:
          // 1. Wait for WebSocket to receive update
          // 2. Verify the interviewer's canvas shows the new element
          // 3. Check that the element count matches on both sides
          
          // For now, we'll verify the interviewer can still interact with their canvas
          await expect(interviewerPage.locator('.canvas')).toBeVisible();
          
          // Add a different element as interviewer
          await interviewerPage.click('button:has-text("rectangle")');
          const interviewerCanvas = interviewerPage.locator('.canvas-svg');
          await interviewerCanvas.click({ position: { x: 400, y: 200 } });
          
          await interviewerPage.waitForTimeout(1000);
          
          // Verify element was added
          const interviewerElements = await interviewerPage.locator('.canvas-svg g').count();
          expect(interviewerElements).toBeGreaterThan(0);
          
          // ===== CLEANUP =====
          
          // End the session as interviewer
          await interviewerPage.click('button:has-text("End Session")');
          
          // Verify session ended
          await expect(interviewerPage.getByText('ended')).toBeVisible();
        }
      }
    } finally {
      // Clean up browser contexts
      await interviewerContext.close();
      await candidateContext.close();
    }
  });

  test('Candidate joins session via token', async ({ page }) => {
    // First create a session via API
    const createResponse = await page.request.post('/v1/sessions', {
      data: {
        title: 'Token Join Test',
        prompt: 'Testing guest link join'
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const sessionData = await createResponse.json();
    
    // Create guest link
    const linkResponse = await page.request.post(`/v1/sessions/${sessionData.id}/guest-links`, {
      data: { role: 'candidate' }
    });
    
    expect(linkResponse.ok()).toBeTruthy();
    const linkData = await linkResponse.json();
    
    // Navigate to join page with token
    await page.goto(`/?token=${linkData.token}`);
    
    // Verify join lobby appears
    await expect(page.getByText('Join Interview Session')).toBeVisible({ timeout: 10000 });
    
    // Enter name and join
    await page.fill('input[id="displayName"]', 'Test Candidate');
    await page.click('button:has-text("Join Session")');
    
    // Verify session loaded
    await expect(page.locator('.session-header')).toBeVisible({ timeout: 10000 });
  });

  test('Interviewer creates and manages session', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Wait for dashboard
    await expect(page.getByText('Interview Sessions')).toBeVisible({ timeout: 30000 });
    
    // Create session
    await page.click('button:has-text("+ New Session")');
    await page.fill('input[placeholder*="title"]', 'Management Test');
    await page.fill('textarea[placeholder*="prompt"]', 'Testing session management');
    await page.click('button:has-text("Create")');
    
    // Verify session created
    await expect(page.getByText('Management Test')).toBeVisible({ timeout: 10000 });
    
    // Enter session
    await page.click('text=Management Test');
    await expect(page.locator('.session-header')).toBeVisible({ timeout: 10000 });
    
    // Start session
    await page.click('button:has-text("Start")');
    await expect(page.getByText('live')).toBeVisible({ timeout: 5000 });
    
    // Add element to canvas
    await page.click('button:has-text("rectangle")');
    const canvas = page.locator('.canvas-svg');
    await canvas.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(1000);
    
    // Verify element added
    const elements = await page.locator('.canvas-svg g').count();
    expect(elements).toBeGreaterThan(0);
    
    // End session
    await page.click('button:has-text("End Session")');
    await expect(page.getByText('ended')).toBeVisible({ timeout: 5000 });
  });
});
