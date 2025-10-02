
// Normalize API base URL: remove trailing slash and trailing /api if present
let apiBase = process.env.REACT_APP_API_URL || '';
apiBase = apiBase.replace(/\/+$/, ''); // Remove trailing slash
apiBase = apiBase.replace(/\/api$/, ''); // Remove trailing /api
export const API_BASE_URL = apiBase;

export const updateSheet = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/update-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (response.ok) {
        const data = await response.json();
        return { success: true, message: "Sheet updated successfully!", data };
      } else {
        return { success: false, message: "Failed to update the sheet." };
      }
    } catch (error) {
      console.error("Error updating sheet:", error);
      return { success: false, message: "Error occurred while updating the sheet." };
    }
  };

  