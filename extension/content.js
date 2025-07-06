// Content script to extract job data from various job boards
console.log('JobTracker content script loaded on:', window.location.href);

let isExtracting = false;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Content script received message:', request);
  
  if (request.action === 'extractJobData') {
    if (isExtracting) {
      sendResponse({error: 'Already extracting data'});
      return;
    }
    
    isExtracting = true;
    showExtractionLoader();
    
    setTimeout(() => {
      const jobData = extractJobData();
      console.log('Extracted job data:', jobData);
      
      hideExtractionLoader();
      isExtracting = false;
      
      // Store the data temporarily
      chrome.storage.local.set({pendingJobData: jobData}, function() {
        sendResponse({jobData: jobData});
      });
    }, 1500); // Minimal delay to show extraction is happening
    
    return true; // Keep the message channel open for async response
  }
});

function showExtractionLoader() {
  const loader = document.createElement('div');
  loader.id = 'jobtracker-extraction-loader';
  loader.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  loader.innerHTML = `
    <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 1s linear infinite;"></div>
    Extracting job data...
  `;
  
  if (!document.querySelector('#jobtracker-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'jobtracker-spinner-style';
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(loader);
}

function hideExtractionLoader() {
  const loader = document.getElementById('jobtracker-extraction-loader');
  if (loader) {
    loader.remove();
  }
}

function extractJobData() {
  const url = window.location.href;
  let jobData = {
    jobUrl: url,
    extractedAt: new Date().toISOString()
  };

  if (url.includes('linkedin.com/jobs')) {
    jobData = extractLinkedInData();
  } else if (url.includes('internshala.com')) {
    jobData = extractInternshalaData();
  } else {
    jobData = extractGenericData();
  }

  jobData.jobUrl = url;
  console.log('Final extracted data:', jobData);
  return jobData;
}

function extractLinkedInData() {
  const jobData = {};
  
  try {
    // Company name - multiple selectors for different LinkedIn layouts
    const companySelectors = [
      '.job-details-jobs-unified-top-card__primary-description-container .app-aware-link',
      '.jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name a',
      '[data-test-id="job-details-company-name"]',
      '.jobs-company-name'
    ];
    
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.company = element.textContent.trim();
        break;
      }
    }

    // Job title - multiple selectors
    const titleSelectors = [
      '.jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title h1',
      '[data-test-id="job-title"]',
      '.jobs-job-title'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.position = element.textContent.trim();
        break;
      }
    }

    // Location - multiple selectors
    const locationSelectors = [
      '.jobs-unified-top-card__primary-description-container .jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__primary-description-container .jobs-unified-top-card__bullet',
      '[data-test-id="job-location"]'
    ];
    
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.location = element.textContent.trim();
        break;
      }
    }

    // Description
    const descriptionSelectors = [
      '.jobs-description-content__text',
      '.job-details-jobs-unified-top-card__job-description .jobs-description-content__text',
      '[data-test-id="job-description"]'
    ];
    
    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.description = element.textContent.trim();
        break;
      }
    }

    // Salary/compensation
    const salarySelectors = [
      '.jobs-unified-top-card__job-insight',
      '.job-details-jobs-unified-top-card__job-insight'
    ];
    
    for (const selector of salarySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.salary = element.textContent.trim();
        break;
      }
    }

  } catch (error) {
    console.error('Error extracting LinkedIn data:', error);
  }

  return jobData;
}

function extractInternshalaData() {
  const jobData = {};
  
  try {
    // Company name - improved selectors
    const companySelectors = [
      '.heading_4_5 a',
      '.company-name',
      '.company_name',
      '.company',
      'h4.heading_4_5 a'
    ];
    
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.company = element.textContent.trim();
        break;
      }
    }

    // Job title/Position - improved selectors
    const titleSelectors = [
      '.heading_4_5.profile',
      'div.heading_4_5.profile',
      '.profile',
      'h1.heading_4_5'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.position = element.textContent.trim();
        break;
      }
    }

    // Location - using the specific selector provided by user
    try {
      const locationElement = document.querySelector('#location_names a');
      if (locationElement && locationElement.textContent.trim()) {
        jobData.location = locationElement.textContent.trim();
      }
    } catch (error) {
      console.log('Primary location selector failed, trying fallbacks');
      // Fallback selectors
      const locationSelectors = [
        '.location_names span a',
        '.location_names > span > a',
        '.location_names a',
        '.location a'
      ];
      
      for (const selector of locationSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          jobData.location = element.textContent.trim();
          break;
        }
      }
    }

    // Salary/Stipend - improved selectors
    const salarySelectors = [
      'span.stipend',
      '.stipend',
      '.salary',
      '.compensation'
    ];
    
    for (const selector of salarySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.salary = element.textContent.trim();
        break;
      }
    }

    // Description - improved selectors
    const descriptionSelectors = [
      '.text-container',
      '.description',
      '.job-description',
      '.detail_text'
    ];
    
    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.description = element.textContent.trim();
        break;
      }
    }

  } catch (error) {
    console.error('Error extracting Internshala data:', error);
  }

  return jobData;
}

function extractGenericData() {
  const jobData = {};
  
  try {
    // Try to find common job posting elements with improved selectors
    const titleSelectors = [
      'h1',
      '.job-title',
      '.position-title',
      '[data-testid="job-title"]',
      '.title',
      'h2'
    ];
    
    const companySelectors = [
      '.company-name',
      '.employer',
      '.company',
      '[data-testid="company-name"]',
      '.organization'
    ];
    
    const locationSelectors = [
      '.location',
      '.job-location',
      '.workplace-type',
      '[data-testid="location"]',
      '.address'
    ];
    
    const descriptionSelectors = [
      '.job-description',
      '.description',
      '.job-details',
      '[data-testid="description"]',
      '.content'
    ];

    // Extract title
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.position = element.textContent.trim();
        break;
      }
    }

    // Extract company
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.company = element.textContent.trim();
        break;
      }
    }

    // Extract location
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.location = element.textContent.trim();
        break;
      }
    }

    // Extract description
    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        jobData.description = element.textContent.trim();
        break;
      }
    }

  } catch (error) {
    console.error('Error extracting generic data:', error);
  }

  return jobData;
}

// Setup auto-detection only for apply button clicks
function setupAutoApplyDetection() {
  console.log('Setting up auto-apply detection');
  
  // Use the specific apply button class provided by user
  const applySelectors = [
    '.top_apply_now_cta',
    '.btn.btn-primary.top_apply_now_cta.apply',
    'button.btn.btn-primary.top_apply_now_cta.apply',
    '.apply-btn',
    '[data-apply="true"]'
  ];
  
  applySelectors.forEach(selector => {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach(button => {
      if (!button.hasAttribute('data-jobtracker-listener')) {
        button.setAttribute('data-jobtracker-listener', 'true');
        button.addEventListener('click', function(event) {
          console.log('Apply button clicked, extracting data...');
          
          setTimeout(() => {
            isExtracting = true;
            showExtractionLoader();
            
            setTimeout(() => {
              const jobData = extractJobData();
              console.log('Auto-extracted job data:', jobData);
              
              hideExtractionLoader();
              isExtracting = false;
              
              // Save data and send to background script
              chrome.storage.local.set({
                pendingJobData: jobData,
                autoOpenPopup: true
              }, function() {
                showNotification('✅ Job data extracted! Extension will open automatically.');
                // Send message to background script to save data
                chrome.runtime.sendMessage({
                  action: 'saveJobData',
                  jobData: jobData
                });
              });
            }, 1500);
          }, 1000);
        });
      }
    });
  });

  // Also detect generic apply buttons as fallback
  const genericButtons = document.querySelectorAll('button, a');
  genericButtons.forEach(button => {
    const text = button.textContent.toLowerCase();
    if ((text.includes('apply') || text.includes('submit application')) && 
        !button.hasAttribute('data-jobtracker-listener') &&
        !button.classList.contains('top_apply_now_cta')) {
      button.setAttribute('data-jobtracker-listener', 'true');
      button.addEventListener('click', function() {
        setTimeout(() => {
          isExtracting = true;
          showExtractionLoader();
          
          setTimeout(() => {
            const jobData = extractJobData();
            
            hideExtractionLoader();
            isExtracting = false;
            
            chrome.storage.local.set({
              pendingJobData: jobData,
              autoOpenPopup: true
            });
            showNotification('Job data extracted! Extension will open automatically.');
          }, 1500);
        }, 2000);
      });
    }
  });
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2), 0 6px 12px rgba(0,0,0,0.15);
    animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    max-width: 300px;
    line-height: 1.4;
  `;
  
  if (!document.querySelector('#jobtracker-animations')) {
    const style = document.createElement('style');
    style.id = 'jobtracker-animations';
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) reverse';
    setTimeout(() => notification.remove(), 400);
  }, 4000);
}

// Initialize auto-detection when page loads
setupAutoApplyDetection();

// Also run when DOM changes (for SPAs)
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      clearTimeout(window.jobTrackerSetupTimeout);
      window.jobTrackerSetupTimeout = setTimeout(setupAutoApplyDetection, 500);
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Remove the auto-extraction on page load - only work when extension is opened or apply is clicked
