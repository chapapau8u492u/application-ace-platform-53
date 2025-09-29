
// Content script to extract job data from various job boards
console.log('JobTracker content script loaded on:', window.location.href);

// Check if script already loaded to prevent duplicate declarations
if (typeof window.jobTrackerLoaded === 'undefined') {
  window.jobTrackerLoaded = true;
  
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

    console.log('Starting job data extraction from:', url);

    if (url.includes('linkedin.com/jobs')) {
      jobData = extractLinkedInData();
    } else if (url.includes('internshala.com')) {
      jobData = extractInternshalaData();
    } else if (url.includes('unstop.com')) {
      jobData = extractUnstopData();
    } else {
      jobData = extractGenericData();
    }

    // Ensure we have the URL and timestamp
    jobData.jobUrl = url;
    jobData.extractedAt = new Date().toISOString();

    // If we didn't get much data, try a more aggressive extraction
    if (!jobData.company && !jobData.position) {
      console.log('Primary extraction failed, trying aggressive extraction...');
      jobData = aggressiveExtraction();
    }

    console.log('Final extracted data:', jobData);
    return jobData;
  }

  function aggressiveExtraction() {
    const jobData = {
      jobUrl: window.location.href,
      extractedAt: new Date().toISOString()
    };

    try {
      // Try to find any text that looks like a job title (usually in h1, h2, or large text)
      const titleElements = document.querySelectorAll('h1, h2, h3, .title, .job-title, [class*="title"]');
      for (const element of titleElements) {
        const text = element.textContent?.trim();
        if (text && text.length > 5 && text.length < 100 && !jobData.position) {
          jobData.position = text;
          console.log('Aggressive extraction found position:', text);
          break;
        }
      }

      // Try to find company name (usually in links or spans)
      const companyElements = document.querySelectorAll('a[href*="company"], .company, [class*="company"], [class*="org"]');
      for (const element of companyElements) {
        const text = element.textContent?.trim();
        if (text && text.length > 2 && text.length < 50 && !jobData.company) {
          jobData.company = text;
          console.log('Aggressive extraction found company:', text);
          break;
        }
      }

      // Try to find location (usually contains city, state, country)
      const locationElements = document.querySelectorAll('[class*="location"], [class*="address"], [class*="place"]');
      for (const element of locationElements) {
        const text = element.textContent?.trim();
        if (text && text.length > 3 && text.length < 100 && !jobData.location) {
          jobData.location = text;
          console.log('Aggressive extraction found location:', text);
          break;
        }
      }

      // Try to find description (usually the largest text block)
      const descriptionElements = document.querySelectorAll('p, div, section');
      let longestText = '';
      for (const element of descriptionElements) {
        const text = element.textContent?.trim();
        if (text && text.length > longestText.length && text.length > 100) {
          longestText = text;
        }
      }
      if (longestText && longestText.length > 100) {
        jobData.description = longestText.substring(0, 1000); // Limit to 1000 chars
        console.log('Aggressive extraction found description (length):', longestText.length);
      }

    } catch (error) {
      console.error('Error in aggressive extraction:', error);
    }

    return jobData;
  }

  function extractLinkedInData() {
    const jobData = {};
    
    try {
      console.log('Extracting LinkedIn data from:', window.location.href);
      
      // Company name - updated selectors based on actual HTML structure
      const companySelectors = [
        '.topcard__org-name-link', // From the provided HTML
        '.sub-nav-cta__optional-url', // From the provided HTML
        '.top-card-layout__second-subline .topcard__org-name-link', // From the provided HTML
        '.job-details-jobs-unified-top-card__primary-description-container .app-aware-link',
        '.jobs-unified-top-card__company-name a',
        '.job-details-jobs-unified-top-card__company-name a',
        '[data-test-id="job-details-company-name"]',
        '.jobs-company-name',
        '.company-name'
      ];
      
      for (const selector of companySelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          jobData.company = element.textContent.trim();
          console.log('Found company:', jobData.company, 'using selector:', selector);
          break;
        }
      }

      // Job title - updated selectors based on actual HTML structure
      const titleSelectors = [
        '.top-card-layout__title', // From the provided HTML
        '.sub-nav-cta__header', // From the provided HTML
        '.topcard__title', // From the provided HTML
        '.jobs-unified-top-card__job-title h1',
        '.job-details-jobs-unified-top-card__job-title h1',
        '[data-test-id="job-title"]',
        '.jobs-job-title',
        'h1'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          jobData.position = element.textContent.trim();
          console.log('Found position:', jobData.position, 'using selector:', selector);
          break;
        }
      }

      // Location - updated selectors based on actual HTML structure
      const locationSelectors = [
        '.sub-nav-cta__meta-text', // From the provided HTML
        '.topcard__flavor--bullet', // From the provided HTML
        '.main-job-card__location', // From the provided HTML
        '.jobs-unified-top-card__primary-description-container .jobs-unified-top-card__bullet',
        '.job-details-jobs-unified-top-card__primary-description-container .jobs-unified-top-card__bullet',
        '[data-test-id="job-location"]',
        '.location'
      ];
      
      for (const selector of locationSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          jobData.location = element.textContent.trim();
          console.log('Found location:', jobData.location, 'using selector:', selector);
          break;
        }
      }

      // Description - updated selectors based on actual HTML structure
      const descriptionSelectors = [
        '.description__text--rich', // From the provided HTML
        '.show-more-less-html__markup', // From the provided HTML
        '.jobs-description-content__text',
        '.job-details-jobs-unified-top-card__job-description .jobs-description-content__text',
        '[data-test-id="job-description"]',
        '.job-description',
        '.description'
      ];
      
      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          jobData.description = element.textContent.trim();
          console.log('Found description (length):', jobData.description.length, 'using selector:', selector);
          break;
        }
      }

      // Salary/compensation - updated selectors based on actual HTML structure
      const salarySelectors = [
        '.main-job-card__salary-info', // From the provided HTML
        '.jobs-unified-top-card__job-insight',
        '.job-details-jobs-unified-top-card__job-insight',
        '.salary',
        '.compensation'
      ];
      
      for (const selector of salarySelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          const text = element.textContent.trim();
          // Only extract if it looks like a salary (contains currency symbols or numbers)
          if (text.match(/[₹$€£¥]\s*\d+|\d+\s*[₹$€£¥]|\d+\s*(lakh|crore|k|thousand|million)/i)) {
            jobData.salary = text;
            console.log('Found salary:', jobData.salary, 'using selector:', selector);
            break;
          }
        }
      }

      // Additional data extraction
      // Job criteria (seniority level, employment type, etc.)
      const criteriaSelectors = [
        '.description__job-criteria-text--criteria'
      ];
      
      const criteriaElements = document.querySelectorAll(criteriaSelectors[0]);
      if (criteriaElements.length > 0) {
        const criteria = Array.from(criteriaElements).map(el => el.textContent.trim()).join(', ');
        if (criteria) {
          jobData.criteria = criteria;
          console.log('Found criteria:', jobData.criteria);
        }
      }

    } catch (error) {
      console.error('Error extracting LinkedIn data:', error);
    }

    console.log('Final LinkedIn extraction result:', jobData);
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
        //console.log('Primary location selector failed, trying fallbacks');
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

  function extractUnstopData() {
    const jobData = {};
    
    try {
      console.log('Extracting Unstop data from:', window.location.href);
      
      // Job title - based on the provided HTML structure
      const titleSelectors = [
        'span[apptranslate="tataCrucible.title"]',
        'span[skiptranslate="true"]',
        '.ng-tns-c1475478733-1',
        'h1',
        'h2'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          const text = element.textContent.trim();
          // Check if it looks like a job title (contains keywords like "Internship", "Hiring", etc.)
          if (text.includes('Internship') || text.includes('Hiring') || text.includes('Analyst') || text.includes('Business')) {
            jobData.position = text;
            console.log('Found position:', jobData.position, 'using selector:', selector);
            break;
          }
        }
      }
      
      // Company name - try to extract from the title or look for company indicators
      if (jobData.position) {
        // Extract company from title if it contains company name
        const titleText = jobData.position;
        if (titleText.includes('Myntra')) {
          jobData.company = 'Myntra';
        } else if (titleText.includes('Tata')) {
          jobData.company = 'Tata';
        } else {
          // Try to find company name in other elements
          const companySelectors = [
            '.org_name',
            '.company-name',
            '.blue_un-hover',
            'a[href*="company"]'
          ];
          
          for (const selector of companySelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
              jobData.company = element.textContent.trim();
              console.log('Found company:', jobData.company, 'using selector:', selector);
              break;
            }
          }
        }
      }
      
      // Description - based on the provided HTML structure
      const descriptionSelectors = [
        '.un_editor_text_live[skiptranslate="true"]',
        '.blue_un-border-before.un_editor_text_live',
        '.tab-detail .un_editor_text_live',
        '.about_game .un_editor_text_live',
        '.un_editor_text_live',
        'div[apptranslate="tataCrucible.competitionDetails"]'
      ];
      
      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          jobData.description = element.textContent.trim();
          console.log('Found description (length):', jobData.description.length, 'using selector:', selector);
          break;
        }
      }
      
      // Salary/Stipend - look for salary information in the description or specific elements
      const salarySelectors = [
        '.items .cptn p',
        '.ng-star-inserted p',
        'p'
      ];
      
      for (const selector of salarySelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent.trim();
          // Look for salary patterns including INR, stipend, etc.
          if (text.match(/INR\s*\d+|\d+\s*INR|₹\s*\d+|\d+\s*₹|\d+\s*(lakh|crore|k|thousand|million)|40,000|Stipend|per month/i)) {
            jobData.salary = text;
            console.log('Found salary:', jobData.salary, 'using selector:', selector);
            break;
          }
        }
        if (jobData.salary) break;
      }
      
      // Duration - look for duration information
      const durationSelectors = [
        '.items .cptn p',
        '.ng-star-inserted p',
        'p'
      ];
      
      for (const selector of durationSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent.trim();
          if (text.match(/\d+\s*months?|Jan.*2026.*June.*2026|6\s*months/i)) {
            jobData.duration = text;
            console.log('Found duration:', jobData.duration, 'using selector:', selector);
            break;
          }
        }
        if (jobData.duration) break;
      }
      
      // Eligibility - extract eligibility information
      const eligibilitySelectors = [
        '.eligibility_sect .items .eligi',
        '.eligibility_sect .items div',
        '.eligi'
      ];
      
      const eligibilityInfo = [];
      for (const selector of eligibilitySelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent.trim();
          if (text && text.length > 2 && text.length < 100) {
            eligibilityInfo.push(text);
          }
        }
      }
      
      if (eligibilityInfo.length > 0) {
        jobData.eligibility = eligibilityInfo.join(', ');
        console.log('Found eligibility:', jobData.eligibility);
      }
      
      // If we still don't have basic data, try a more aggressive approach
      if (!jobData.company && !jobData.position) {
        console.log('Primary extraction failed, trying aggressive extraction...');
        
        // Try to find any text that looks like a job title in headings
        const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (const heading of allHeadings) {
          const text = heading.textContent.trim();
          if (text && text.length > 10 && text.length < 200 && !jobData.position) {
            jobData.position = text;
            console.log('Found position via aggressive search:', jobData.position);
            break;
          }
        }
        
        // Try to find company name in links or spans
        const allLinks = document.querySelectorAll('a, span');
        for (const link of allLinks) {
          const text = link.textContent.trim();
          if (text && text.length < 50 && text.length > 2 && !jobData.company) {
            // Check if it looks like a company name
            if (text.match(/^[A-Z][a-z]+$/) || text.includes('Myntra') || text.includes('Tata')) {
              jobData.company = text;
              console.log('Found company via aggressive search:', jobData.company);
              break;
            }
          }
        }
      }
      
      console.log('Unstop extraction complete:', jobData);
      
    } catch (error) {
      console.error('Error extracting Unstop data:', error);
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
    
    // Use the specific apply button classes provided by user
    const applySelectors = [
      '.top_apply_now_cta',
      '.btn.btn-primary.top_apply_now_cta.apply',
      'button.btn.btn-primary.top_apply_now_cta.apply',
      '.apply-btn',
      '[data-apply="true"]',
      // LinkedIn specific selectors from the provided HTML
      '.sign-up-modal__outlet',
      '.top-card-layout__cta--primary',
      'button[data-modal="apply-sign-up-modal"]',
      'button[data-tracking-control-name*="apply"]'
    ];
    
    applySelectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        if (!button.hasAttribute('data-jobtracker-listener')) {
          button.setAttribute('data-jobtracker-listener', 'true');
          button.addEventListener('click', function(event) {
            //console.log('Apply button clicked, extracting data...');
            
            setTimeout(() => {
              isExtracting = true;
              showExtractionLoader();
              
              setTimeout(() => {
                const jobData = extractJobData();
                //console.log('Auto-extracted job data:', jobData);
                
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
    const genericButtons = document.querySelectorAll('button, a, [role="button"]');
    genericButtons.forEach(button => {
      const text = button.textContent.toLowerCase();
      const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
      const title = button.getAttribute('title')?.toLowerCase() || '';
      
      if ((text.includes('apply') || text.includes('submit application') || 
           ariaLabel.includes('apply') || title.includes('apply')) && 
          !button.hasAttribute('data-jobtracker-listener') &&
          !button.classList.contains('top_apply_now_cta')) {
        
        button.setAttribute('data-jobtracker-listener', 'true');
        console.log('Added listener to generic apply button:', text.trim());
        
        button.addEventListener('click', function() {
          console.log('Generic apply button clicked, extracting data...');
          setTimeout(() => {
            isExtracting = true;
            showExtractionLoader();
            
            setTimeout(() => {
              const jobData = extractJobData();
              console.log('Auto-extracted job data:', jobData);
              
              hideExtractionLoader();
              isExtracting = false;
              
              chrome.storage.local.set({
                pendingJobData: jobData,
                autoOpenPopup: true
              });
              showNotification('Job data extracted! Extension will open automatically.');
              
              // Send message to background script to save data
              chrome.runtime.sendMessage({
                action: 'saveJobData',
                jobData: jobData
              });
            }, 1500);
          }, 1000);
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
}
