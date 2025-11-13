import React, { useEffect, useState } from "react";
import { View, Text, Button, TouchableOpacity, ScrollView, StyleSheet, Linking, Platform, Alert, Image, AppState, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";

const {
  EXPO_PUBLIC_ABLY_API_KEY,
  REACT_APP_GOOGLE_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_CLIENT_SECRET_WEB,
} = process.env;

/** Backend base url */
const baseURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev";

/** AsyncStorage keys */
const CURRENT_SESSION = "currentSession";
const CURRENT_ACCESS_TOKEN = "currentAccessToken";
const CURRENT_PROFILE = "currentProfile";

export default function App({ route, navigation }) {
  WebBrowser.maybeCompleteAuthSession();
  const insets = useSafeAreaInsets();

  const [appStartTime] = useState(() => {
    const startTime = new Date().toISOString();
    console.log("🚀 APP STARTED at:", startTime);
    return startTime;
  });

  const [currentSession, setCurrentSession] = useState(null);
  const [currentAccessToken, setCurrentAccessToken] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googlePhotos, setGooglePhotos] = useState([]);
  const [photoPickerLoading, setPhotoPickerLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [waitingForPhotos, setWaitingForPhotos] = useState(false);

  const [authUrl, setAuthUrl] = useState(null);
  const [googleSessionId, setGoogleSessionId] = useState(null);
  const [screen, setScreen] = useState("login");
  const [lastAction, setLastAction] = useState("");
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);


  const buildNumber = "1.0.0";
  const buildTimestamp = new Date().toLocaleString();

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (window.google && window.google.accounts) {
        setGoogleScriptLoaded(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log("✅ Google Identity Services loaded");
        setGoogleScriptLoaded(true);
      };
      script.onerror = () => {
        console.error("❌ Failed to load Google Identity Services");
      };
      document.body.appendChild(script);
    }
  }, []);

  const reloadAsyncStorage = async () => {
    try {
      console.log("🔄 Reloading AsyncStorage values...");
      const [cs, cat, cp] = await Promise.all([
        AsyncStorage.getItem(CURRENT_SESSION),
        AsyncStorage.getItem(CURRENT_ACCESS_TOKEN),
        AsyncStorage.getItem(CURRENT_PROFILE)
      ]);

      console.log("📦 Reloaded AsyncStorage values:", {
        currentSession: cs,
        currentAccessToken: cat,
        currentProfile: cp,
      });
      console.log("current access token:", currentAccessToken);

      setCurrentSession(cs);
      setCurrentAccessToken(cat);
      setCurrentProfile(cp);

      const isAuth = !!cat && !!cp;
      setAuthenticated(isAuth);

      console.log("🔑 Reloaded authentication state:", {
        session: cs,
        hasToken: !!cat,
        hasProfile: !!cp,
        isAuth,
      });

      return { currentSession, currentAccessToken, currentProfile};
    } catch (err) {
      console.error("❌ Failed to reload AsyncStorage:", err);
      return { currentSession: null, currentAccessToken: null, currentProfile: null };
    }
  };

  useEffect(() => {
    (async () => {
      try {
        console.log("🔄 useEffect RUNNING - App starting up - loading AsyncStorage values...");
        if (Platform.OS !== 'web') {
          const { currentSession: cs, currentAccessToken: cat, currentProfile: cp } = await reloadAsyncStorage();

          const isAuth = !!cat && !!cp;
          setScreen(isAuth ? "app" : "login");

          console.log("🔑 Final authentication state:", {
            session: cs,
            hasToken: !!cat,
            hasProfile: !!cp,
            isAuth,
            screen: isAuth ? "app" : "login",
          });
        } else {
          // ✅ For web, always go straight to app screen (no auth needed)
          console.log("🌐 Web platform - skipping auth check, going to app screen");
          setScreen("app");
          setAuthenticated(true); // Set to true so web shows photo picker
        }
      } catch (err) {
        console.warn("Failed to load AsyncStorage:", err);
      }
    })();

    const handleUrl = async (event) => {
      const { url } = event;
      console.log("🔗 Deep link URL received:", url);

      try {
        const parsed = new URL(url);
        console.log("🔗 Parsed URL protocol:", parsed.protocol);
        console.log("🔗 Parsed URL host:", parsed.host);
        console.log("🔗 Parsed URL pathname:", parsed.pathname);
        console.log("🔗 All search params:", Object.fromEntries(parsed.searchParams));

        let sessionId = null;

        if (parsed.pathname.includes("oauth/callback")) {
          sessionId = parsed.searchParams.get("sessionId") || parsed.searchParams.get("session");
          console.log("🔗 OAuth callback detected, sessionId:", sessionId);
          
          if (sessionId) {
            console.log("🔑 Fetching tokens and profile for OAuth callback");
            await fetchTokensAndProfile(sessionId);
            return;
          }
        }

        if (parsed.protocol === "capshnz:") {
          if (parsed.host === "photos" || parsed.pathname.includes("photos")) {
            sessionId = parsed.searchParams.get("sessionId") || parsed.searchParams.get("session");
            console.log("🔗 Extracted sessionId from capshnz:", sessionId);
          }
        }
        else if (parsed.protocol === "exp:") {
          if (parsed.pathname.includes("photos") || parsed.pathname.includes("--/") || 
              parsed.searchParams.has("sessionId") || parsed.searchParams.has("session")) {
            sessionId = parsed.searchParams.get("sessionId") || parsed.searchParams.get("session");
            console.log("🔗 Extracted sessionId from Expo URL:", sessionId);
          }
        }
        else if ((parsed.protocol === "http:" || parsed.protocol === "https:") && 
                 (parsed.pathname.includes("/photos") || parsed.pathname.includes("/oauth/callback"))) {
          sessionId = parsed.searchParams.get("sessionId") || parsed.searchParams.get("session");
          console.log("🔗 Extracted sessionId from HTTP URL:", sessionId);
        }

        if (sessionId) {
          console.log("📸 Photo picker completed, fetching results for sessionId:", sessionId);
          setGoogleSessionId(sessionId);

          if (!parsed.pathname.includes("oauth/callback")) {
            Alert.alert("Deep Link Detected!", `Session ID: ${sessionId}\nProcessing photos...`);
          }

          if (currentAccessToken) {
            console.log("🔑 Using existing access token with new session ID");
            await updateSessionId(sessionId);
            fetchGooglePhotosWithSession(sessionId);
          } else {
            console.log("🔑 No access token found, fetching tokens and profile");
            await fetchTokensAndProfile(sessionId);
          }
        } else {
          console.log("ℹ️ No sessionId found in URL (this may be normal)");
          if (url.includes("photos") || url.includes("session") || url.includes("oauth")) {
            console.log("🔗 Expected formats:");
            console.log("   - OAuth: capshnz://oauth/callback?sessionId=xyz");
            console.log("   - Production: capshnz://photos/selection?sessionId=xyz");
            console.log("   - Expo Dev: exp://192.168.1.14:8081/--/oauth/callback?sessionId=xyz");
          }
        }
      } catch (error) {
        console.error("❌ Error parsing deep link URL:", error);
        if (url.includes("sessionId") || url.includes("session") || url.includes("photos") || url.includes("oauth")) {
          Alert.alert("Deep Link Error", `Failed to parse URL: ${url}\nError: ${error.message}`);
        }
      }
    };

    const linkingListener = Linking.addEventListener("url", handleUrl);

    Linking.getInitialURL()
      .then((url) => {
        console.log("🔗 Checking initial URL:", url);
        if (url) {
          console.log("🔗 Initial deep link URL found:", url);
          handleUrl({ url });
        } else {
          console.log("🔗 No initial deep link URL");
        }
      })
      .catch((error) => {
        console.error("🔗 Error checking initial URL:", error);
      });

    if (Platform.OS === "web" && typeof window !== "undefined") {
      console.log("🔗 Web platform detected, checking URL parameters...");
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get("sessionId");
      const success = urlParams.get("success");

      if (sessionId && success === "true") {
        console.log("🎉 OAuth callback received with sessionId:", sessionId);

        if (window.opener) {
          window.opener.postMessage(
            {
              type: "OAUTH_SUCCESS",
              sessionId: sessionId,
            },
            window.location.origin
          );
          window.history.replaceState({}, document.title, window.location.pathname);
          window.close();
        } else {
          setGoogleSessionId(sessionId);
          fetchTokensAndProfile(sessionId);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }

    const handleAppStateChange = (nextAppState) => {
      console.log("📱 App state changed to:", nextAppState);
      if (nextAppState === "active") {
        console.log("🔄 App came back into focus - reloading AsyncStorage...");
        reloadAsyncStorage();
      }
    };

    const appStateListener = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      console.log("🔗 Cleaning up listeners...");
      if (linkingListener) {
        linkingListener.remove();
      }
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [currentAccessToken]);

  const apiCall = async (endpoint, options = {}) => {
    const url = `${baseURL}${endpoint}`;

    let accessToken = currentAccessToken;
    if (!accessToken) {
      try {
        accessToken = await AsyncStorage.getItem(CURRENT_ACCESS_TOKEN);
        console.log("🔑 Retrieved access token from AsyncStorage for API call");
      } catch (error) {
        console.error("❌ Failed to get access token from AsyncStorage:", error);
      }
    }

    const config = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...options.headers,
      },
    };

    if (options.data && (options.method === "POST" || options.method === "PUT")) {
      config.body = JSON.stringify(options.data);
    }

    try {
      console.log(`Making API call to: ${url}`);
      const response = await fetch(url, config);
      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`API Success:`, data);
      return data;
    } catch (error) {
      console.error("API Error:", error.message);
      throw new Error(error.message);
    }
  };

  const fetchTokensAndProfile = async (sessionId) => {
    try {
      console.log("🔑 Fetching tokens and profile for sessionId:", sessionId);

      const tokenResponse = await fetch(`${baseURL}/api/oauth/token/${sessionId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error(`Token API Error ${tokenResponse.status}:`, errorText);
        throw new Error(`HTTP ${tokenResponse.status}: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      console.log("🔑 ✅ Tokens received");

      const profileResponse = await fetch(`${baseURL}/api/user/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error(`Profile API Error ${profileResponse.status}:`, errorText);
        throw new Error(`HTTP ${profileResponse.status}: ${errorText}`);
      }

      const profileData = await profileResponse.json();
      console.log("🔑 ✅ Profile received");

      await completeLogin({
        sessionId: sessionId,
        accessToken: tokenData.access_token,
        profile: JSON.stringify(profileData),
      });

      Alert.alert("Authentication Complete!", "You're now signed in!", [{ text: "OK" }]);
    } catch (error) {
      console.error("🔑 ❌ Failed to fetch tokens and profile:", error);
      Alert.alert("Authentication Error", `Failed to complete authentication: ${error.message}`);
    }
  };

  const platformParam = Platform.OS === "android" ? "android" : Platform.OS === "ios" ? "ios" : "web";
  
  const signInGoogle = async () => {
    try {
      const isDevelopment = __DEV__;
      let redirectUri;
      
      if (Platform.OS === 'web') {
        redirectUri = typeof window !== 'undefined' 
          ? `${window.location.origin}/oauth/callback`
          : 'http://localhost:19006/oauth/callback';
      } else if (isDevelopment) {
        redirectUri = 'exp://192.168.1.14:8081/--/oauth/callback';
      } else {
        redirectUri = 'capshnz://oauth/callback/photos/picker';
      }

      console.log("🔗 Using redirect URI:", redirectUri);

      const endpoint = `/api/oauth/url?platform=${encodeURIComponent(platformParam)}&redirectUri=${encodeURIComponent(redirectUri)}`;
      const url = `${baseURL}${endpoint}`;
      console.log("Calling backend for auth url:", url);

      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn("Backend returned non-OK:", resp.status);
        const text = await resp.text();
        console.warn(text);
        return;
      }
      const data = await resp.json();
      const { authUrl: returnedAuthUrl, sessionId } = data;
      console.log("backend returned:", data);

      setAuthUrl(returnedAuthUrl);
      setGoogleSessionId(sessionId);

      if (returnedAuthUrl) {
        if (Platform.OS === "web") {
          const oauthWindow = window.open(returnedAuthUrl, "_blank", "width=600,height=700");

          const handleMessage = (event) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === "OAUTH_SUCCESS" && event.data.sessionId) {
              console.log("🎉 OAuth success received via postMessage:", event.data.sessionId);
              setGoogleSessionId(event.data.sessionId);
              fetchTokensAndProfile(event.data.sessionId);
              oauthWindow.close();
              window.removeEventListener("message", handleMessage);
            }
          };

          window.addEventListener("message", handleMessage);

          Alert.alert("Google Sign In Started", "Please complete authentication in the popup window.");
        } else {
          Linking.openURL(returnedAuthUrl);
          Alert.alert("Google Sign In Started", "Please complete authentication in your browser, then return to this app.");
        }
      } else {
        console.warn("No authUrl returned from backend.");
      }
    } catch (err) {
      console.warn("signInGoogle error:", err);
      Alert.alert("Error", `Google login failed: ${err.message}`);
    }
  };

  const completeLogin = async ({ sessionId, accessToken, profile }) => {
    try {
      console.log("🔑 Completing login with sessionId:", sessionId);

      await AsyncStorage.setItem(CURRENT_SESSION, sessionId ?? "error");
      await AsyncStorage.setItem(CURRENT_ACCESS_TOKEN, accessToken ?? "error");
      await AsyncStorage.setItem(CURRENT_PROFILE, profile ?? "error");
      console.log("💾 ✅ Current session data stored in AsyncStorage");

      setCurrentSession(sessionId);
      setCurrentAccessToken(accessToken);
      setCurrentProfile(profile);
      setGoogleSessionId(sessionId);

      setAuthenticated(true);
      setScreen("app");
      setLastAction("✅ Authentication completed successfully!");
      console.log("✅ completeLogin done: sessionId", sessionId);
      console.log("✅ completeLogin done: accessToken", accessToken);
    } catch (err) {
      console.error("❌ completeLogin error:", err);
      Alert.alert("Login Error", `Failed to complete login: ${err.message}`);
    }
  };

  const updateSessionId = async (newSessionId) => {
    try {
      console.log("🔄 Updating session ID to:", newSessionId);
      await AsyncStorage.setItem(CURRENT_SESSION, newSessionId);
      setCurrentSession(newSessionId);
      setGoogleSessionId(newSessionId);

      const storedSession = await AsyncStorage.getItem(CURRENT_SESSION);
      console.log("✅ Session ID updated successfully. Stored value:", storedSession);
    } catch (err) {
      console.error("❌ Failed to update session ID:", err);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(CURRENT_SESSION);
      await AsyncStorage.removeItem(CURRENT_ACCESS_TOKEN);
      await AsyncStorage.removeItem(CURRENT_PROFILE);

      setCurrentSession(null);
      setCurrentAccessToken(null);
      setCurrentProfile(null);
      setGooglePhotos([]);
      setImageErrors({});
      setWaitingForPhotos(false);
      setGoogleSessionId(null);

      setAuthenticated(false);
      setScreen("login");
      setLastAction("Logged out successfully.");
      console.log("Logged out. AsyncStorage cleared.");
    } catch (err) {
      console.warn("logout error:", err);
    }
  };

  const fetchAuthenticatedImage = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl, {
        headers: {
          Authorization: `Bearer ${currentAccessToken}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } else {
        console.error(`Failed to fetch image: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error("Error fetching authenticated image:", error);
      return null;
    }
  };

  const startGooglePicker = async () => {
    
   if (!currentAccessToken) {
    Alert.alert(
      "Not Authenticated", 
      "Please sign in with Google first to use the photo picker."
    );
    return;
  }

  // For WEB
  if (Platform.OS === "web") {
    try {
      setPhotoPickerLoading(true);
      console.log("📸 Starting Google Photo Picker (Web)...");
      console.log("🔑 Access token:", currentAccessToken ? `${currentAccessToken.substring(0, 20)}...` : "None");

      // Create picker session
      const response = await fetch(`${baseURL}/api/photos/picker/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentAccessToken}`
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to create session:", errorText);
        throw new Error("Failed to create picker session");
      }

      const session = await response.json();
      console.log("✅ Picker session created:", session.id);

      // Open picker
      const pickerWindow = window.open(
        session.pickerUri,
        "GooglePhotosPicker",
        "width=800,height=600,scrollbars=yes,resizable=yes"
      );

      if (!pickerWindow) {
        throw new Error("Popup blocked. Please allow popups.");
      }

      console.log("⏳ Waiting for photo selection...");

      // Check if popup closed
      const checkInterval = setInterval(() => {
        if (pickerWindow.closed) {
          clearInterval(checkInterval);
          console.log("🪟 Picker window closed, fetching results...");
          setPhotoPickerLoading(false);

          setTimeout(async () => {
            setWaitingForPhotos(true);
            try {
              console.log("📸 Fetching photos for session:", session.id);
              
              const photosResponse = await fetch(
                `${baseURL}/api/photos/picker/media?sessionId=${session.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${currentAccessToken}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (!photosResponse.ok) {
                throw new Error("Failed to fetch photos");
              }

              const data = await photosResponse.json();
              console.log("📸 Photos data:", data);

              if (data.mediaItems && data.mediaItems.length > 0) {
                const photos = data.mediaItems.map((item, index) => {
                  const baseUrl = item.mediaFile?.baseUrl || item.baseUrl || item.url;
                  if (!baseUrl) return null;
                  
                  return {
                    id: item.id || `photo-${index}`,
                    name: item.mediaFile?.filename || `Photo ${index + 1}`,
                    url: baseUrl,
                    thumbnails: [{ 
                      url: `${baseUrl}=w200-h200`
                    }],
                  };
                }).filter(photo => photo !== null);

                console.log("✅ Processed", photos.length, "photos");
                setGooglePhotos(photos);
                Alert.alert("Success", `Selected ${photos.length} photos!`);
              } else {
                Alert.alert("No Photos", "No photos were selected");
              }
            } catch (error) {
              console.error("❌ Error fetching photos:", error);
              Alert.alert("Error", `Failed to fetch photos: ${error.message}`);
            } finally {
              setWaitingForPhotos(false);
            }
          }, 2000);
        }
      }, 500);

      // Safety timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!pickerWindow.closed) {
          pickerWindow.close();
        }
        setPhotoPickerLoading(false);
      }, 300000);

    } catch (error) {
      console.error("❌ Web picker error:", error);
      Alert.alert("Error", error.message);
      setPhotoPickerLoading(false);
    }
    return;
  }


  
    if (!currentAccessToken) {
      Alert.alert("Not Authenticated", "Please sign in first before using the Photo Picker.");
      return;
    }
    if (!currentAccessToken) {
      Alert.alert("Not Authenticated", "Please sign in first before using the Photo Picker.");
      return;
    }

    try {
      setPhotoPickerLoading(true);
      console.log("📸 Starting Google Photo Picker...");

      try {
        await apiCall("/api/user/profile");
        console.log("✅ Session is still valid");
      } catch (error) {
        console.log("❌ Session expired, need to re-authenticate");
        Alert.alert("Session Expired", "Your session has expired. Please sign in again.", [
          { text: "OK", onPress: () => logout() }
        ]);
        return;
      }

      const session = await apiCall("/api/photos/picker/session", {
        method: "POST",
      });

      if (!session.pickerUri) {
        throw new Error("Failed to get picker URI");
      }

      console.log("Opening Photo Picker UI:", session.pickerUri);

    } catch (error) {
      console.error("Error starting Photo Picker:", error);
      Alert.alert("Error", "Failed to start Photo Picker. Please Sign In Again.");
      setWaitingForPhotos(false);
    } finally {
      setPhotoPickerLoading(false);
    }
  };

  const fetchGooglePhotosWithSession = async (sessionId) => {
    try {
      setWaitingForPhotos(true);
      setLoading(true);
      console.log("📸 Fetching Google Photos with session ID:", sessionId);

      const data = await apiCall(`/api/photos/picker/media?sessionId=${sessionId}`);

      const photos = [];

      for (const item of data.mediaItems || []) {
        const baseUrl = item.mediaFile?.baseUrl;

        if (baseUrl) {
          const thumbnailUrl = baseUrl + "=w200-h200";
          const authenticatedThumbnailUrl = await fetchAuthenticatedImage(thumbnailUrl);

          const photo = {
            id: item.id,
            name: item.mediaFile?.filename || `Photo ${item.id}`,
            url: baseUrl,
            thumbnails: [
              {
                url: authenticatedThumbnailUrl || thumbnailUrl,
              },
            ],
            mimeType: item.mediaFile?.mimeType,
            creationTime: item.createTime,
            width: item.mediaFile?.mediaFileMetadata?.width,
            height: item.mediaFile?.mediaFileMetadata?.height,
          };
          photos.push(photo);
        }
      }

      if (photos.length > 0) {
        console.log("✅ Photo picker results received:", photos.length, "photos");
        setGooglePhotos(photos);
        Alert.alert("Success", `Selected ${photos.length} photos!`);
        setLastAction(`✅ Loaded ${photos.length} photos`);
      } else {
        Alert.alert("No Photos", "No photos were selected");
        setLastAction("❌ No photos selected");
      }
    } catch (error) {
      console.error("❌ Failed to fetch photos with session:", error);
      Alert.alert("Error", "Failed to fetch selected photos");
      setLastAction("❌ Failed to fetch photos");
    } finally {
      setLoading(false);
      setWaitingForPhotos(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  
  const LoginScreen = () => (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.centeredContent}>
        <Text style={styles.title}>Google Photos Picker</Text>

        {photoPickerLoading ? (
          <ActivityIndicator size="large" color="#46C3A6" style={styles.loader} />
        ) : (
          <TouchableOpacity style={styles.mainButton} onPress={signInGoogle}>
            <Text style={styles.mainButtonText}>Sign In with Google</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  
  const AppScreen = () => {
    if (loading) {
      return (
        <View style={[styles.container, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color="#46C3A6" />
        </View>
      );
    }

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Google Photos Picker</Text>

          {photoPickerLoading || waitingForPhotos ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#46C3A6" />
              <Text style={styles.loadingText}>
                {waitingForPhotos ? "⏳ Processing Photos..." : "Starting Picker..."}
              </Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.mainButton} 
              onPress={startGooglePicker}
            >
              <Text style={styles.mainButtonText}>Select Photos</Text>
            </TouchableOpacity>
          )}

          {googlePhotos && googlePhotos.length > 0 && (
            <View style={styles.photosSection}>
              <Text style={styles.photosTitle}>Selected Photos ({googlePhotos.length})</Text>
              <View style={styles.photosGrid}>
                {googlePhotos.map((photo, index) => (
                  <View key={index} style={styles.photoWrapper}>
                    {photo.thumbnails?.[0]?.url && !imageErrors[photo.id] ? (
                      <Image
                        source={{ uri: photo.thumbnails[0].url }}
                        style={styles.photoImage}
                        resizeMode='cover'
                        onError={(error) => {
                          console.log("Thumbnail error:", photo.name, error.nativeEvent);
                          setImageErrors((prev) => ({ ...prev, [photo.id]: "thumbnail_failed" }));
                        }}
                      />
                    ) : photo.url && imageErrors[photo.id] === "thumbnail_failed" ? (
                      <Image
                        source={{ uri: photo.url }}
                        style={styles.photoImage}
                        resizeMode='cover'
                        onError={(error) => {
                          console.log("Full image error:", photo.name, error.nativeEvent);
                          setImageErrors((prev) => ({ ...prev, [photo.id]: "both_failed" }));
                        }}
                      />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Text style={styles.photoIcon}>📷</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return screen === "app" || authenticated ? <AppScreen /> : <LoginScreen />;
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#C8DAD8" 
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: { 
    padding: 20,
    alignItems: 'center',
  },
  title: { 
    fontSize: 24, 
    fontWeight: "700", 
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  mainButton: {
    backgroundColor: "#46C3A6",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 200,
  },
  mainButtonText: { 
    color: "white", 
    fontSize: 18, 
    fontWeight: "600" 
  },
  loader: {
    marginVertical: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  photosSection: {
    marginTop: 30,
    width: '100%',
  },
  photosTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
    textAlign: 'center',
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  photoWrapper: {
    margin: 8,
  },
  photoImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  photoIcon: {
    fontSize: 24,
  },
});