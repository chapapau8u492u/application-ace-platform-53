
// Background script for the Chrome extension
console.log('JobTracker background script loaded');

// Handle installation
chrome.runtime.onInstalled.addListener(function(details) {
  console.log('JobTracker extension installed');
  
  // Set up periodic sync for local storage data
  setupPeriodicSync();
});

// Set up periodic sync to try sending local storage data to server
function setupPeriodicSync() {
  // Check for local applications every 5 minutes
  setInterval(async () => {
    try {
      const result = await chrome.storage.local.get(['localApplications']);
      const localApplications = result.localApplications || [];
      
      if (localApplications.length > 0) {
        console.log(`Found ${localApplications.length} local applications to sync`);
        await syncLocalApplications(localApplications);
      }
    } catch (error) {
      console.error('Error during periodic sync check:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Sync local applications to server
async function syncLocalApplications(localApplications) {
  const syncedApplications = [];
  const failedApplications = [];
  
  for (const app of localApplications) {
    try {
      const response = await fetch('https://job-hunter-backend-sigma.vercel.app/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'chrome-extension://' + chrome.runtime.id
        },
        body: JSON.stringify(app)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Successfully synced local application:', app.id);
        syncedApplications.push(app.id);
      } else {
        console.error(`Failed to sync application ${app.id}: ${response.status}`);
        failedApplications.push(app);
      }
    } catch (error) {
      console.error(`Error syncing application ${app.id}:`, error);
      failedApplications.push(app);
    }
  }
  
  // Remove successfully synced applications from local storage
  if (syncedApplications.length > 0) {
    const remainingApplications = localApplications.filter(app => 
      !syncedApplications.includes(app.id)
    );
    
    await chrome.storage.local.set({
      localApplications: remainingApplications
    });
    
    console.log(`Synced ${syncedApplications.length} applications, ${remainingApplications.length} remaining locally`);
  }
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Background received message:', request);
  
  if (request.action === 'saveJobData') {
    handleSaveJobData(request.jobData, sendResponse);
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'openPopup') {
    // Open the popup programmatically
    chrome.action.openPopup();
    sendResponse({success: true});
    return true;
  }
});

async function handleSaveJobData(jobData, sendResponse) {
  console.log('Handling save job data:', jobData);
  
  try {
    // Try production URL first
    const response = await fetch('https://job-hunter-backend-sigma.vercel.app/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'chrome-extension://' + chrome.runtime.id
      },
      body: JSON.stringify(jobData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Successfully saved to production app:', data);
      sendResponse({success: true, data: data});
      
      // Also try to communicate directly with any open JobTracker tabs
      notifyJobTrackerTabs(jobData);
      return;
    }
    
    console.error(`Server responded with status ${response.status}: ${response.statusText}`);
    const errorText = await response.text();
    console.error('Server error response:', errorText);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
  } catch (error) {
    console.error('Production URL failed:', error);
    
    try {
      // Fallback to localhost for development
      const fallbackResponse = await fetch('https://job-hunter-backend-sigma.vercel.app/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'chrome-extension://' + chrome.runtime.id
        },
        body: JSON.stringify(jobData)
      });
      
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        console.log('Successfully saved to fallback URL:', data);
        sendResponse({success: true, data: data});
        
        // Also try to communicate directly with any open JobTracker tabs
        notifyJobTrackerTabs(jobData);
        return;
      }
      
      console.error(`Fallback server responded with status ${fallbackResponse.status}: ${fallbackResponse.statusText}`);
      const fallbackErrorText = await fallbackResponse.text();
      console.error('Fallback server error response:', fallbackErrorText);
      throw new Error(`Fallback failed: HTTP ${fallbackResponse.status}`);
      
    } catch (fallbackError) {
      console.error('Both primary and fallback URLs failed:', fallbackError);
      
      // Try direct communication with JobTracker tabs
      const tabsNotified = await notifyJobTrackerTabs(jobData);
      if (tabsNotified) {
        sendResponse({success: true, message: 'Data sent directly to JobTracker app'});
      } else {
        sendResponse({success: false, error: fallbackError.message});
      }
    }
  }
}

async function notifyJobTrackerTabs(jobData) {
  try {
    console.log('Notifying JobTracker tabs with data:', jobData);
    
    // Find all tabs that might be the JobTracker app
    const tabs = await chrome.tabs.query({});
    let notified = false;
    
    for (const tab of tabs) {
      if (tab.url && (
        tab.url.includes('preview--application-ace-platform.lovable.app') ||
        tab.url.includes('localhost:5173') ||
        tab.url.includes('127.0.0.1:5173') ||
        tab.url.includes('lovable.app') ||
        tab.url.includes('vercel.app')
      )) {
        console.log('Found JobTracker tab:', tab.url);
        
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'JOB_APPLICATION_DATA',
            jobData: jobData
          });
          console.log('Sent job data to JobTracker tab via message:', tab.url);
          notified = true;
        } catch (error) {
          console.log('Could not send message to tab, trying script injection:', error);
          
          // Try using executeScript to inject the data
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (data) => {
                console.log('Injecting job data into JobTracker app:', data);
                
                // Try multiple methods to communicate with the app
                window.postMessage({
                  type: 'JOB_APPLICATION_DATA',
                  jobData: data
                }, '*');
                
                // Also store in localStorage for the app to pick up
                localStorage.setItem('extensionJobData', JSON.stringify(data));
                
                // Trigger a storage event
                window.dispatchEvent(new StorageEvent('storage', {
                  key: 'extensionJobData',
                  newValue: JSON.stringify(data)
                }));
                
                // Trigger a custom refresh event
                const refreshEvent = new CustomEvent('jobApplicationAdded', {
                  detail: { timestamp: Date.now(), jobData: data }
                });
                window.dispatchEvent(refreshEvent);
                
                console.log('JobTracker extension: Data injected into app via multiple methods');
              },
              args: [jobData]
            });
            notified = true;
            console.log('Successfully injected data into JobTracker tab:', tab.url);
          } catch (scriptError) {
            console.log('Could not inject script:', scriptError);
          }
        }
      }
    }
    
    console.log('Notification result:', notified);
    return notified;
  } catch (error) {
    console.error('Error notifying JobTracker tabs:', error);
    return false;
  }
}
