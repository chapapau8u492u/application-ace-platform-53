// Client-side API for downloading the extension
export const downloadExtension = async (): Promise<void> => {
  try {
    console.log('Starting extension download...');
    
    const response = await fetch('https://job-hunter-backend-sigma.vercel.app/api/download-extension', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}: ${errorText}`);
    }

    console.log('Response received, creating blob...');
    
    // Get the zip file as a blob
    const blob = await response.blob();
    
    if (blob.size === 0) {
      throw new Error('Downloaded file is empty');
    }
    
    console.log('Blob created, size:', blob.size, 'bytes');
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'JobTracker-Extension.zip';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('Download initiated successfully');

  } catch (error) {
    console.error('Download error:', error);
    throw new Error(`Failed to download extension: ${error.message}`);
  }
};
