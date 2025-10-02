import AsyncStorage from "@react-native-async-storage/async-storage";

import { REACT_APP_GOOGLE_CLIENT_ID_wEB } from "@env";

const GOOGLE_CLIENT_ID = REACT_APP_GOOGLE_CLIENT_ID_wEB;
const GOOGLE_CLIENT_SECRET = "YOUR_CLIENT_SECRET"; // You'll need to add this
const REDIRECT_URI = "http://localhost:19006/auth/callback"; // Web callback URL

class GooglePhotosService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Store tokens securely
  async storeTokens(accessToken, refreshToken) {
    try {
      await AsyncStorage.setItem("google_access_token", accessToken);
      if (refreshToken) {
        await AsyncStorage.setItem("google_refresh_token", refreshToken);
      }
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
    } catch (error) {
      console.error("Error storing tokens:", error);
    }
  }

  // Retrieve stored tokens
  async loadTokens() {
    try {
      const accessToken = await AsyncStorage.getItem("google_access_token");
      const refreshToken = await AsyncStorage.getItem("google_refresh_token");

      if (accessToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        return { accessToken, refreshToken };
      }
      return null;
    } catch (error) {
      console.error("Error loading tokens:", error);
      return null;
    }
  }

  // Clear stored tokens
  async clearTokens() {
    try {
      await AsyncStorage.removeItem("google_access_token");
      await AsyncStorage.removeItem("google_refresh_token");
      this.accessToken = null;
      this.refreshToken = null;
    } catch (error) {
      console.error("Error clearing tokens:", error);
    }
  }

  // Check if user is authenticated
  async isAuthenticated() {
    const tokens = await this.loadTokens();
    return tokens && tokens.accessToken;
  }

  // Refresh access token using refresh token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: this.refreshToken,
          grant_type: "refresh_token",
        }).toString(),
      });

      const data = await response.json();

      if (data.access_token) {
        await this.storeTokens(data.access_token, this.refreshToken);
        return data.access_token;
      } else {
        throw new Error("Failed to refresh token");
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw error;
    }
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken() {
    if (!this.accessToken) {
      const tokens = await this.loadTokens();
      if (!tokens) {
        throw new Error("No authentication tokens found");
      }
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
    }

    // Try to use current token, refresh if it fails
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v1/tokeninfo", {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Token invalid");
      }

      return this.accessToken;
    } catch (error) {
      console.log("Token invalid, refreshing...");
      return await this.refreshAccessToken();
    }
  }

  // Create Photo Picker session
  async createPhotoPickerSession() {
    const accessToken = await this.getValidAccessToken();

    try {
      const response = await fetch("https://photospicker.googleapis.com/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Photo Picker session error: ${response.status} - ${errorData.error?.message || "Unknown error"}`);
      }

      const sessionData = await response.json();
      console.log("Photo Picker session created:", sessionData);
      return sessionData;
    } catch (error) {
      console.error("Error creating Photo Picker session:", error);
      throw error;
    }
  }

  // Fetch selected photos from Photo Picker session
  async fetchSelectedPhotos(sessionId, retryCount = 0) {
    const accessToken = await this.getValidAccessToken();

    try {
      const pageSize = 25;
      const response = await fetch(`https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}&pageSize=${pageSize}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.error?.status === "FAILED_PRECONDITION") {
          // Retry up to 3 times with increasing delays
          if (retryCount < 3) {
            const delay = (retryCount + 1) * 2000; // 2s, 4s, 6s
            return new Promise((resolve) => {
              setTimeout(async () => {
                const result = await this.fetchSelectedPhotos(sessionId, retryCount + 1);
                resolve(result);
              }, delay);
            });
          }
          return [];
        }

        throw new Error(`Photo Picker API error: ${response.status} - ${errorData.error?.message || "Unknown error"}`);
      }

      const data = await response.json();
      return this.transformPhotoData(data.mediaItems || []);
    } catch (error) {
      console.error("Error fetching selected photos:", error);
      throw error;
    }
  }

  // Transform photo data to consistent format
  transformPhotoData(mediaItems) {
    return mediaItems.map((item) => {
      const baseUrl = item.mediaFile?.baseUrl;

      return {
        id: item.id,
        name: item.mediaFile?.filename || `Photo ${item.id}`,
        url: baseUrl,
        thumbnailUrl: baseUrl ? `${baseUrl}=w200-h200` : null,
        fullSizeUrl: baseUrl ? `${baseUrl}=w2048-h2048` : null,
        mimeType: item.mediaFile?.mimeType,
        creationTime: item.createTime,
        width: item.mediaFileMetadata?.width,
        height: item.mediaFileMetadata?.height,
      };
    });
  }

  // Fetch photos from Google Drive (alternative method)
  async fetchDrivePhotos() {
    const accessToken = await this.getValidAccessToken();

    try {
      const response = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=mimeType contains 'image/'&pageSize=20&fields=files(id,name,mimeType,createdTime,modifiedTime,size,webViewLink,thumbnailLink,imageMediaMetadata,webContentLink)&orderBy=modifiedTime desc",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Drive API error: ${response.status} - ${errorData.error?.message || "Unknown error"}`);
      }

      const data = await response.json();
      return this.transformDriveData(data.files || []);
    } catch (error) {
      console.error("Error fetching Drive photos:", error);
      throw error;
    }
  }

  // Transform Drive data to consistent format
  transformDriveData(files) {
    return files.map((file) => ({
      id: file.id,
      name: file.name,
      url: file.webViewLink,
      thumbnailUrl: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w200-h200`,
      fullSizeUrl: file.webContentLink,
      mimeType: file.mimeType,
      size: file.size,
      modifiedTime: file.modifiedTime,
      imageMetadata: file.imageMediaMetadata,
    }));
  }
}

export default new GooglePhotosService();
