
// Background script for the Chrome extension
//console.log('JobTracker background script loaded');

// Handle installation
chrome.runtime.onInstalled.addListener(function(details) {
  //console.log('JobTracker extension installed');
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  //console.log('Background received message:', request);
  
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
  //console.log('Handling save job data:', jobData);
  
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
      //console.log('Successfully saved to production app:', data);
      sendResponse({success: true, data: data});
      
      // Also try to communicate directly with any open JobTracker tabs
      notifyJobTrackerTabs(jobData);
      return;
    }
    
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
        //console.log('Successfully saved to localhost:', data);
        sendResponse({success: true, data: data});
        
        // Also try to communicate directly with any open JobTracker tabs
        notifyJobTrackerTabs(jobData);
        return;
      }
      
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
    // Find all tabs that might be the JobTracker app
    const tabs = await chrome.tabs.query({});
    let notified = false;
    
    for (const tab of tabs) {
      if (tab.url && (
        tab.url.includes('preview--application-ace-platform.lovable.app') ||
        tab.url.includes('localhost:5173') ||
        tab.url.includes('127.0.0.1:5173')
      )) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'JOB_APPLICATION_DATA',
            jobData: jobData
          });
          //console.log('Sent job data to JobTracker tab:', tab.url);
          notified = true;
        } catch (error) {
          //console.log('Could not send message to tab:', error);
          
          // Try using executeScript to inject the data
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (data) => {
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
                
                //console.log('JobTracker extension: Data injected into app');
              },
              args: [jobData]
            });
            notified = true;
          } catch (scriptError) {
            //console.log('Could not inject script:', scriptError);
          }
        }
      }
    }
    
    return notified;
  } catch (error) {
    console.error('Error notifying JobTracker tabs:', error);
    return false;
  }
}
