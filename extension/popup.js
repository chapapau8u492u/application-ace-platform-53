
document.addEventListener('DOMContentLoaded', function() {
  const content = document.getElementById('content');
  let isLoading = false;
  let hasExtractedData = false;
  let currentJobData = null;

  // Automatically extract and load job data when popup opens
  autoLoadJobData();

  function autoLoadJobData() {
    // First check if we have pending data in storage
    chrome.storage.local.get(['pendingJobData', 'autoOpenPopup'], function(result) {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        showInitialState();
        return;
      }

      if (result.pendingJobData && (result.pendingJobData.company || result.pendingJobData.position)) {
        displayJobData(result.pendingJobData);
        hasExtractedData = true;
        currentJobData = result.pendingJobData;
        
        if (result.autoOpenPopup) {
          showStatus('Data extracted automatically! Review and save below.', 'success');
          chrome.storage.local.remove(['autoOpenPopup']);
        }
        return;
      }
      
      // If no stored data, show initial state
      showInitialState();
    });
  }

  function showInitialState() {
    hasExtractedData = false;
    currentJobData = null;
    content.innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">🎯</div>
        <h3>Ready to Track!</h3>
        <p>Navigate to a job posting on Internshala or LinkedIn, then click the button below or just click Apply on the job page.</p>
        <button class="btn btn-primary" id="extractBtn">
          <span id="extractText">Extract Job Data</span>
        </button>
      </div>
    `;
    
    document.getElementById('extractBtn')?.addEventListener('click', extractFromCurrentPage);
  }

  function extractFromCurrentPage() {
    if (isLoading) return;
    
    setLoadingState(true);
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (chrome.runtime.lastError) {
        console.error('Tabs query error:', chrome.runtime.lastError);
        showRetryInterface('Unable to access current tab. Please refresh and try again.');
        return;
      }

      const currentTab = tabs[0];
      
      if (!currentTab || !currentTab.url) {
        showRetryInterface('Unable to access current page. Please refresh and try again.');
        return;
      }
      
      // Check if we're on a supported job site
      if (!isJobSite(currentTab.url)) {
        showNoJobSite();
        return;
      }
      
      // Inject content script if not already present
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content.js']
      }, function() {
        if (chrome.runtime.lastError) {
          console.error('Script injection error:', chrome.runtime.lastError);
          showRetryInterface('Unable to inject script. Please refresh the page and try again.');
          return;
        }
        
        // Add a small delay to ensure script is loaded
        setTimeout(() => {
          // Now try to extract data
          chrome.tabs.sendMessage(currentTab.id, {action: 'extractJobData'}, function(response) {
            setLoadingState(false);
            
            if (chrome.runtime.lastError) {
              console.error('Message error:', chrome.runtime.lastError);
              // Try fallback extraction methods
              tryFallbackExtraction(currentTab);
              return;
            }
            
            if (response && response.jobData) {
              const hasValidData = response.jobData.company || response.jobData.position;
              if (hasValidData) {
                // Get current page URL for jobUrl if not provided
                if (!response.jobData.jobUrl) {
                  response.jobData.jobUrl = currentTab.url;
                }
                
                displayJobData(response.jobData);
                hasExtractedData = true;
                currentJobData = response.jobData;
                
                // Store the extracted data
                chrome.storage.local.set({
                  pendingJobData: response.jobData
                });
              } else {
                tryFallbackExtraction(currentTab);
              }
            } else {
              tryFallbackExtraction(currentTab);
            }
          });
        }, 500);
      });
    });
  }

  function tryFallbackExtraction(tab) {
    // Try to extract using common selectors as fallback
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractWithFallbackSelectors
    }, function(result) {
      if (chrome.runtime.lastError) {
        console.error('Fallback extraction error:', chrome.runtime.lastError);
        showRetryInterface('Data extraction failed. Try manual entry or refresh the page.');
        return;
      }

      if (result && result[0] && result[0].result) {
        const jobData = result[0].result;
        if (jobData.company || jobData.position) {
          if (!jobData.jobUrl) {
            jobData.jobUrl = tab.url;
          }
          
          displayJobData(jobData);
          hasExtractedData = true;
          currentJobData = jobData;
          
          chrome.storage.local.set({
            pendingJobData: jobData
          });
          return;
        }
      }
      
      showRetryInterface('Limited job data found. You can manually enter the details.');
    });
  }

  function extractWithFallbackSelectors() {
    try {
      const jobData = {
        company: '',
        position: '',
        location: '',
        salary: '',
        description: '',
        jobUrl: window.location.href
      };

      // Try multiple selectors for job title
      const titleSelectors = [
        '.job-title-href',
        '.job-title',
        'h1[data-testid="job-title"]',
        '.jobs-unified-top-card__job-title',
        '.jobsearch-SerpJobCard h2 a',
        '.job-title-link',
        '[data-cy="job-title"]'
      ];

      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          jobData.position = element.textContent?.trim() || element.innerText?.trim() || '';
          if (jobData.position) break;
        }
      }

      // Try multiple selectors for company
      const companySelectors = [
        '.jobs-unified-top-card__company-name a',
        '.jobs-unified-top-card__company-name',
        '.jobsearch-SerpJobCard .company',
        '.company-name',
        '[data-cy="company-name"]',
        '.job-company'
      ];

      for (const selector of companySelectors) {
        const element = document.querySelector(selector);
        if (element) {
          jobData.company = element.textContent?.trim() || element.innerText?.trim() || '';
          if (jobData.company) break;
        }
      }

      // Try multiple selectors for salary/stipend
      const salarySelectors = [
        '.stipend',
        '.jobs-unified-top-card__job-insight .jobs-unified-top-card__job-insight-text',
        '.salary-snippet',
        '.salary',
        '[data-cy="salary"]'
      ];

      for (const selector of salarySelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim() || element.innerText?.trim() || '';
          if (text && (text.includes('₹') || text.includes('$') || text.includes('salary') || text.includes('stipend'))) {
            jobData.salary = text;
            break;
          }
        }
      }

      // Try multiple selectors for location
      const locationSelectors = [
        '.jobs-unified-top-card__bullet',
        '.location',
        '.job-location',
        '[data-cy="location"]'
      ];

      for (const selector of locationSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          jobData.location = element.textContent?.trim() || element.innerText?.trim() || '';
          if (jobData.location) break;
        }
      }

      // Try multiple selectors for description
      const descriptionSelectors = [
        '.job_summary_container',
        '.jobs-description__content',
        '.jobsearch-jobDescriptionText',
        '.job-description',
        '[data-cy="job-description"]'
      ];

      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          jobData.description = element.textContent?.trim() || element.innerText?.trim() || '';
          if (jobData.description && jobData.description.length > 50) break;
        }
      }

      return jobData;
    } catch (error) {
      console.error('Fallback extraction error:', error);
      return {
        company: '',
        position: '',
        location: '',
        salary: '',
        description: '',
        jobUrl: window.location.href
      };
    }
  }

  function isJobSite(url) {
    const jobSites = [
      'linkedin.com/jobs',
      'internshala.com/internship',
      'internshala.com/job',
      'naukri.com',
      'indeed.com',
      'glassdoor.com',
      'monster.com',
      'shine.com',
      'foundit.in'
    ];
    
    return jobSites.some(site => url.includes(site));
  }

  function setLoadingState(loading) {
    isLoading = loading;
    
    if (loading) {
      content.innerHTML = `
        <div class="loading-state">
          <div class="loading-icon">
            <div class="spinner"></div>
          </div>
          <div class="loading-text">
            <h3>Extracting Job Data</h3>
            <p>Analyzing the current job posting...</p>
          </div>
        </div>
      `;
    }
  }

  function showNoJobSite() {
    content.innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">🔍</div>
        <h3>Navigate to a Job Page</h3>
        <p>Please visit a job posting on LinkedIn, Internshala, or other supported job sites to extract job data.</p>
        <button class="btn btn-primary" id="manualExtractBtn">Try Extract Anyway</button>
      </div>
    `;
    
    document.getElementById('manualExtractBtn')?.addEventListener('click', extractFromCurrentPage);
  }

  function showRetryInterface(message) {
    content.innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">⚠️</div>
        <h3>Extraction Issue</h3>
        <p>${message}</p>
        <div style="display: flex; gap: 8px; width: 100%; max-width: 200px;">
          <button class="btn btn-secondary" id="retryBtn" style="flex: 1;">Retry</button>
          <button class="btn btn-primary" id="manualAddBtn" style="flex: 1;">Manual</button>
        </div>
      </div>
    `;
    
    document.getElementById('retryBtn')?.addEventListener('click', extractFromCurrentPage);
    document.getElementById('manualAddBtn')?.addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        displayJobData({
          company: '',
          position: '',
          location: '',
          salary: '',
          jobUrl: currentTab ? currentTab.url : '',
          description: ''
        });
        hasExtractedData = true;
        currentJobData = {
          company: '',
          position: '',
          location: '',
          salary: '',
          jobUrl: currentTab ? currentTab.url : '',
          description: ''
        };
      });
    });
  }

  function displayJobData(jobData) {
    content.innerHTML = `
      <div class="hint-bar">
        💡 Review and edit the data below before saving
      </div>
      <div class="job-form">
        <div class="form-row">
          <div class="form-group">
            <label>Company</label>
            <input type="text" id="company" value="${escapeHtml(jobData.company || '')}" placeholder="Company name" />
          </div>
          <div class="form-group">
            <label>Position</label>
            <input type="text" id="position" value="${escapeHtml(jobData.position || '')}" placeholder="Job title" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Location</label>
            <input type="text" id="location" value="${escapeHtml(jobData.location || '')}" placeholder="Location" />
          </div>
          <div class="form-group">
            <label>Salary</label>
            <input type="text" id="salary" value="${escapeHtml(jobData.salary || '')}" placeholder="Amount" />
          </div>
        </div>
        <div class="form-group full-width">
          <label>Job URL</label>
          <input type="text" id="jobUrl" value="${escapeHtml(jobData.jobUrl || '')}" placeholder="Job posting URL" />
        </div>
        <div class="form-group full-width">
          <label>Description <span style="color: #64748b; font-weight: normal;">(Optional)</span></label>
          <textarea id="description" placeholder="Job requirements and details (optional)">${escapeHtml(jobData.description || '')}</textarea>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" id="extractNewBtn">Extract New</button>
        <button class="btn btn-primary" id="saveBtn">
          <span id="saveText">Save to JobTracker</span>
        </button>
      </div>
      <div id="status"></div>
    `;

    document.getElementById('saveBtn').addEventListener('click', saveJobData);
    document.getElementById('extractNewBtn').addEventListener('click', () => {
      // Clear stored data and allow new extraction
      chrome.storage.local.remove(['pendingJobData']);
      hasExtractedData = false;
      currentJobData = null;
      extractFromCurrentPage();
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function saveJobData() {
    const saveBtn = document.getElementById('saveBtn');
    const saveText = document.getElementById('saveText');
    
    if (saveBtn.disabled) return;
    
    const jobData = {
      company: document.getElementById('company')?.value.trim() || '',
      position: document.getElementById('position')?.value.trim() || '',
      location: document.getElementById('location')?.value.trim() || '',
      salary: document.getElementById('salary')?.value.trim() || '',
      jobUrl: document.getElementById('jobUrl')?.value.trim() || '',
      description: document.getElementById('description')?.value.trim() || '',
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'Applied'
    };

    // Validate required fields
    if (!jobData.company || !jobData.position) {
      showStatus('Please fill in Company and Position fields', 'error');
      return;
    }

    // Set loading state
    saveBtn.disabled = true;
    saveBtn.classList.add('btn-loading');
    saveText.textContent = 'Saving...';

    // Send to JobTracker app
    sendToJobTracker(jobData);
  }

  function sendToJobTracker(jobData) {
    //console.log('Sending job data to JobTracker:', jobData);

    const apiUrl = 'https://job-hunter-backend-sigma.vercel.app/api/applications';
    
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(jobData)
    })
    .then(response => {
      //console.log('API Response status:', response.status);
      if (response.ok) {
        return response.json();
      } else if (response.status === 409) {
        throw new Error('DUPLICATE_APPLICATION');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    })
    .then(data => {
      //console.log('Successfully saved to JobTracker:', data);
      chrome.storage.local.remove(['pendingJobData']);
      showSuccessState();
    })
    .catch(error => {
      console.error('Failed to save to JobTracker:', error);
      
      if (error.message === 'DUPLICATE_APPLICATION') {
        showStatus('❌ This application already exists in your JobTracker!', 'error');
      } else if (error.message.includes('Failed to fetch')) {
        showStatus('❌ Cannot connect to JobTracker. Please ensure the app is running on https://job-hunter-backend-sigma.vercel.app/', 'error');
      } else {
        showStatus('❌ An error occurred while saving. Please try again.', 'error');
      }
      resetSaveButton();
    });
  }

  function resetSaveButton() {
    const saveBtn = document.getElementById('saveBtn');
    const saveText = document.getElementById('saveText');
    
    if (saveBtn && saveText) {
      saveBtn.disabled = false;
      saveBtn.classList.remove('btn-loading');
      saveText.textContent = 'Save to JobTracker';
    }
  }

  function showSuccessState() {
    content.innerHTML = `
      <div class="success-state">
        <div class="success-icon">✅</div>
        <h3>Success!</h3>
        <p>Your job application has been saved to JobTracker successfully.</p>
        <button class="btn btn-primary" id="newExtractBtn">Extract Another Job</button>
      </div>
    `;
    
    document.getElementById('newExtractBtn')?.addEventListener('click', () => {
      hasExtractedData = false;
      currentJobData = null;
      extractFromCurrentPage();
    });
  }

  function showStatus(message, type) {
    let statusDiv = document.getElementById('status');
    if (!statusDiv) {
      statusDiv = document.createElement('div');
      statusDiv.id = 'status';
      const actionsDiv = document.querySelector('.actions');
      if (actionsDiv && actionsDiv.parentNode) {
        actionsDiv.parentNode.insertBefore(statusDiv, actionsDiv.nextSibling);
      }
    }
    
    statusDiv.innerHTML = `<div class="status status-${type}">${message}</div>`;
    setTimeout(() => {
      if (statusDiv && type !== 'error') { // Keep error messages visible longer
        statusDiv.innerHTML = '';
      }
    }, type === 'error' ? 8000 : 5000);
  }
});
