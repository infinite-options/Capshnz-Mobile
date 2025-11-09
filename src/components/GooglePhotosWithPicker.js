import React, { useEffect, useState } from "react";
import { View, Text, Button, ActivityIndicator, Image, ScrollView, Alert, TouchableOpacity } from "react-native";

export default function GooglePhotosWithPicker({ userData, backendUrl, onPhotosSelected }) {
  const [pickerInited, setPickerInited] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  backendUrl = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev";
  
  // Load Google Identity Services script
  useEffect(() => {
    if (window.google && window.google.accounts) {
      setPickerInited(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("✅ Google Identity loaded");
      setPickerInited(true);
    };
    script.onerror = () => setError("Failed to load Google Identity Services");
    document.body.appendChild(script);
  }, []);

  // Start Google Photos Picker flow
  const startPhotoPicker = async () => {
    if (!pickerInited) {
      setError("Google services are still loading. Please wait...");
      return;
    }

    if (!clientId) {
      setError("Missing Google Client ID (check .env)");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope:
          "https://www.googleapis.com/auth/photoslibrary.readonly https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.error("❌ Token error:", tokenResponse);
            setError("Authentication failed.");
            setIsLoading(false);
            return;
          }

          console.log("✅ Access token received");
          setAccessToken(tokenResponse.access_token);
          await createPickerSession(tokenResponse.access_token);
        },
      });

      tokenClient.requestAccessToken({ prompt: "" });
    } catch (err) {
      console.error("❌ Error starting picker:", err);
      setError("Failed to start picker.");
      setIsLoading(false);
    }
  };

  // Create picker session on backend
  const createPickerSession = async (token) => {
    try {
      console.log("📸 Creating picker session...");
      const response = await fetch(`${backendUrl}/api/photos/picker/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ accessToken: token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Session creation failed");
      }

      const data = await response.json();
      console.log("✅ Picker session created:", data);
      openPickerWindow(data.pickerUri, token, data.id);
    } catch (err) {
      console.error("❌ Error creating session:", err);
      setError("Failed to create picker session.");
      setIsLoading(false);
    }
  };

  // Open picker popup (web only)
  const openPickerWindow = (pickerUri, token, sessionId) => {
    const pickerWindow = window.open(
      pickerUri,
      "GooglePhotosPicker",
      "width=800,height=600,scrollbars=yes,resizable=yes"
    );

    if (!pickerWindow) {
      setError("Popup blocked. Please allow popups for this site.");
      setIsLoading(false);
      return;
    }

    pollPickerSession(token, sessionId);
  };

  // Poll backend until photos are selected
  const pollPickerSession = async (token, sessionId) => {
    console.log("⏳ Polling picker session...");
    let attempts = 0;
    const maxAttempts = 60;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        setError("Picker timed out.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/api/photos/picker/media?sessionId=${sessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) return;
        const sessionData = await response.json();

        if (sessionData.mediaItems && sessionData.mediaItems.length > 0) {
          clearInterval(interval);
          console.log("✅ Photos selected, fetching...");
          await fetchSelectedPhotos(token, sessionId);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);
  };

  // Fetch selected photos
const fetchSelectedPhotos = async (token, sessionId) => {
  try {
    console.log(`📥 Fetching selected media items from session: ${sessionId}`);

    const amazonApiUrl = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev";
    const response = await fetch(
      `${amazonApiUrl}/api/photos/picker/media?sessionId=${sessionId}`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      }
    );

    const data = await response.json();
    console.log("📸 Media API response:", data);

    if (!response.ok) throw new Error(data.error || "Failed to fetch media items");
    if (!data.mediaItems || !Array.isArray(data.mediaItems) || data.mediaItems.length === 0)
      throw new Error("No photos selected.");

    // Handle multiple possible URL formats
    const urls = data.mediaItems.map((item) => {
      let url =
        item.mediaFile?.baseUrl || // matches your logged structure
        item.baseUrl ||
        item.url ||
        item.mediaItem?.baseUrl;

      if (!url) return null;
      if (url.startsWith("http://")) url = url.replace("http://", "https://");
      if (!url.includes("=")) url += "=w2048-h2048"; // ensure full-size preview
      return url;
    }).filter(Boolean);

    console.log("🖼️ Extracted photo URLs:", urls);
    console.log("🖼️ Photo URL with token:", `${urls}=w2048-h2048&access_token=${accessToken}`);

    // ✅ Set your React state
    setSelectedPhotos(urls);
    console.log("🖼️ Final photo URLs being set:", urls);
    setIsLoading(false);
    setError(null);

    if (onPhotosSelected) onPhotosSelected(urls);
  } catch (err) {
    console.error("❌ Error fetching selected media items:", err);
    setError(err.message);
    setIsLoading(false);
  }
};



  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#C8DAD8" }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 20 }}>Google Photos Picker</Text>

      {error && (
        <Text style={{ color: "red", marginBottom: 10, textAlign: "center", width: "80%" }}>{error}</Text>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#46C3A6" />
      ) : (
        <TouchableOpacity
          onPress={startPhotoPicker}
          style={{
            backgroundColor: "#46C3A6",
            borderRadius: 25,
            paddingVertical: 12,
            paddingHorizontal: 40,
          }}
        >
          <Text style={{ color: "white", fontSize: 18, fontWeight: "600" }}>Select Photos</Text>
        </TouchableOpacity>
      )}

      {selectedPhotos.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
          {selectedPhotos.map((url, index) => (
            <Image
              key={index}
              //source={{ uri: url }}
              source={{
                uri: `${url}=w2048-h2048&access_token=${accessToken}`,
              }}
              style={{
                width: 150,
                height: 150,
                margin: 8,
                borderRadius: 10,
                backgroundColor: "#eee", // fallback for loading state
              }}
              resizeMode="cover"
              
            />
          ))}
        </View>
)}
    </View>
  );
}
