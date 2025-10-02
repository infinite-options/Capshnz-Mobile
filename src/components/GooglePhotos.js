import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, FlatList, Image, ScrollView, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import GooglePhotosService from "../services/GooglePhotosService";
import { REACT_APP_GOOGLE_CLIENT_ID_wEB } from "@env";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";

// Configure redirect URI based on platform
const redirectUri =
  Platform.OS === "web"
    ? "http://localhost:19006/auth/callback"
    : AuthSession.makeRedirectUri({
        scheme: "com.capshnz.mobile",
        path: "oauth",
      });

const SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly https://www.googleapis.com/auth/drive.readonly";

export default function GooglePhotos() {
  const navigation = useNavigation();
  const route = useRoute();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPickerSession, setPhotoPickerSession] = useState(null);

  // PKCE OAuth parameters
  const [oauthParams, setOauthParams] = useState(null);
  const [tokenResponse, setTokenResponse] = useState(null);
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [authUrl, setAuthUrl] = useState(null);

  useEffect(() => {
    checkAuthenticationStatus();
    handleOAuthCallback();
  }, []);

  // Handle OAuth callback when app returns from Google
  const handleOAuthCallback = () => {
    if (Platform.OS === "web") {
      console.log("=== OAUTH CALLBACK DEBUG ===");
      console.log("Current URL:", window.location.href);
      console.log("Search params:", window.location.search);

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");
      const state = urlParams.get("state");

      console.log("Callback parameters:", {
        code: code ? code.substring(0, 20) + "..." : "none",
        error,
        state,
      });

      if (code) {
        console.log("OAuth callback detected with code:", code);
        // Automatically exchange code for token
        exchangeCodeForToken(code);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (error) {
        console.error("OAuth error:", error);
        setError(`OAuth error: ${error}`);
      } else {
        console.log("No OAuth callback parameters found");
      }
      console.log("=============================");
    }
  };

  const checkAuthenticationStatus = async () => {
    try {
      const authenticated = await GooglePhotosService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error("Error checking authentication:", error);
    }
  };

  // Generate PKCE parameters
  const generatePKCEParams = async () => {
    try {
      // Debug environment variables
      console.log("Environment variables:", {
        REACT_APP_GOOGLE_CLIENT_ID_wEB: REACT_APP_GOOGLE_CLIENT_ID_wEB,
        processEnv: process.env,
      });

      // Check if client ID is loaded
      if (!REACT_APP_GOOGLE_CLIENT_ID_wEB) {
        throw new Error("REACT_APP_GOOGLE_CLIENT_ID_wEB environment variable is not set");
      }

      // Generate code verifier (43-128 characters, URL-safe) - using hex like the working example
      const codeVerifierArray = Array.from(await Crypto.getRandomBytesAsync(64));
      const codeVerifierString = codeVerifierArray.map((b) => ("0" + b.toString(16)).slice(-2)).join("");

      // Generate code challenge (SHA256 of code verifier, base64url encoded)
      const codeChallenge = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, codeVerifierString, { encoding: Crypto.CryptoEncoding.BASE64 });
      // Convert base64 to base64url
      const codeChallengeBase64Url = codeChallenge.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

      // Generate state for CSRF protection - using hex like the working example
      const stateArray = Array.from(await Crypto.getRandomBytesAsync(16));
      const stateString = stateArray.map((b) => ("0" + b.toString(16)).slice(-2)).join("");

      const params = {
        client_id: REACT_APP_GOOGLE_CLIENT_ID_wEB,
        code_verifier: codeVerifierString,
        code_challenge: codeChallengeBase64Url,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: SCOPE,
        state: stateString,
        code_challenge_method: "S256",
      };

      console.log("PKCE Debug:", {
        codeVerifier: codeVerifierString,
        codeChallenge: codeChallenge,
        codeChallengeBase64Url: codeChallengeBase64Url,
        clientId: REACT_APP_GOOGLE_CLIENT_ID_wEB,
        redirectUri: redirectUri,
        state: stateString,
      });

      setOauthParams(params);
      return params;
    } catch (error) {
      console.error("Error generating PKCE params:", error);
      setError(`Error generating PKCE parameters: ${error.message}`);
      return null;
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    const params = await generatePKCEParams();
    if (params) {
      setShowLoginScreen(true);
    }
  };

  const handleLogin = async () => {
    if (!oauthParams) return;

    setIsLoading(true);
    setError(null);

    try {
      // Create the authorization request
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: oauthParams.client_id,
        redirect_uri: oauthParams.redirect_uri,
        response_type: oauthParams.response_type,
        scope: oauthParams.scope,
        state: oauthParams.state,
        code_challenge: oauthParams.code_challenge,
        code_challenge_method: oauthParams.code_challenge_method,
        access_type: "offline",
        prompt: "consent",
      }).toString()}`;

      console.log("=== OAUTH FLOW DEBUG ===");
      console.log("Full Authorization URL:", authUrl);
      console.log("Client ID being passed:", oauthParams.client_id);
      console.log("Redirect URI being passed:", oauthParams.redirect_uri);
      console.log("State parameter:", oauthParams.state);
      console.log("Code challenge:", oauthParams.code_challenge);
      console.log("=========================");

      // Store the auth URL for display
      setAuthUrl(authUrl);

      console.log("Opening WebBrowser...");
      // Use WebBrowser for all platforms (it handles both web and native)
      const result = await WebBrowser.openAuthSessionAsync(authUrl, oauthParams.redirect_uri);

      console.log("WebBrowser returned:", result);

      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const state = url.searchParams.get("state");

        if (error) {
          setError(`Authentication error: ${error}`);
          return;
        }

        if (code && state === oauthParams.state) {
          await exchangeCodeForToken(code);
        } else {
          setError("Invalid response from Google");
        }
      } else if (result.type === "cancel") {
        setError("Authentication cancelled");
      } else {
        setError("Authentication failed");
      }
    } catch (error) {
      setError(`Authentication error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exchangeCodeForToken = async (code) => {
    console.log("=== TOKEN EXCHANGE DEBUG ===");
    console.log("Exchanging code for token...");
    console.log("Code:", code ? code.substring(0, 20) + "..." : "none");
    console.log("Client ID:", oauthParams?.client_id);
    console.log("Redirect URI:", oauthParams?.redirect_uri);
    console.log("Code verifier:", oauthParams?.code_verifier ? oauthParams.code_verifier.substring(0, 20) + "..." : "none");

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: oauthParams.client_id,
          code: code,
          redirect_uri: oauthParams.redirect_uri,
          grant_type: "authorization_code",
          code_verifier: oauthParams.code_verifier,
        }).toString(),
      });

      console.log("Token exchange response status:", response.status);
      const data = await response.json();
      console.log("Token exchange response data:", data);
      setTokenResponse(data);

      if (data.access_token) {
        console.log("✅ Authentication successful! Access token received.");
        await GooglePhotosService.storeTokens(data.access_token, data.refresh_token);
        setIsAuthenticated(true);
        setShowLoginScreen(false);
        Alert.alert("Success", "Successfully authenticated! Opening Google Photo Picker...");

        // Test Photo Picker API accessibility first
        console.log("Testing Photo Picker API accessibility...");
        try {
          const testResponse = await fetch("https://photospicker.googleapis.com/v1/sessions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.access_token}`,
            },
          });
          console.log("Photo Picker API test response status:", testResponse.status);
          if (testResponse.ok) {
            console.log("✅ Photo Picker API is accessible");
          } else {
            const errorData = await testResponse.json();
            console.error("❌ Photo Picker API test failed:", errorData);
          }
        } catch (error) {
          console.error("❌ Photo Picker API test error:", error);
        }

        // Automatically open Photo Picker after successful authentication
        setTimeout(() => {
          openPhotoPicker();
        }, 1000);
      } else {
        console.error("❌ Authentication failed:", data);
        setError(`Authentication failed: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      setError(`Error during authentication: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await GooglePhotosService.clearTokens();
      setIsAuthenticated(false);
      setSelectedPhotos([]);
      setPhotoPickerSession(null);
      Alert.alert("Logged Out", "You have been logged out of Google Photos.");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Create a new Photo Picker session
  const createPhotoPickerSession = async () => {
    if (!isAuthenticated) {
      setError("Please authenticate first");
      return null;
    }

    try {
      console.log("=== GOOGLE PHOTO PICKER API VERIFICATION ===");
      console.log("Using Photo Picker API endpoint: https://photospicker.googleapis.com/v1/sessions");
      console.log("Scope: https://www.googleapis.com/auth/photospicker.mediaitems.readonly");
      console.log("This is NOT the Google Photos API (photoslibrary.googleapis.com)");
      console.log("=============================================");

      console.log("Creating Photo Picker session...");
      const response = await fetch("https://photospicker.googleapis.com/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await GooglePhotosService.getValidAccessToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Photo Picker session creation error:", errorData);
        throw new Error(`Photo Picker session error: ${response.status} - ${errorData.error?.message || "Unknown error"}`);
      }

      const sessionData = await response.json();
      console.log("Photo Picker session created:", sessionData);
      return sessionData;
    } catch (error) {
      console.error("Error creating Photo Picker session:", error);
      throw error;
    }
  };

  const openPhotoPicker = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const session = await createPhotoPickerSession();
      setPhotoPickerSession(session);

      if (session.pickerUri) {
        console.log("Opening Photo Picker at:", session.pickerUri);

        if (Platform.OS === "web") {
          // For web, open in new window
          const pickerWindow = window.open(session.pickerUri, "_blank", "width=800,height=600");

          // Poll for when the window is closed or check for updates
          const checkPickerStatus = setInterval(async () => {
            if (pickerWindow.closed) {
              clearInterval(checkPickerStatus);
              console.log("Photo Picker window closed, loading selected photos...");

              // Wait a bit for the session to be updated on Google's side
              setTimeout(async () => {
                await loadSelectedPhotos(session.id);
              }, 3000); // Wait 3 seconds for session to update
            }
          }, 1000);

          // Also try to fetch photos after a longer delay in case the window doesn't close properly
          setTimeout(async () => {
            clearInterval(checkPickerStatus);
            console.log("Photo Picker timeout, loading selected photos...");
            await loadSelectedPhotos(session.id);
          }, 30000); // 30 second timeout
        } else {
          // For mobile, use Linking
          const supported = await Linking.canOpenURL(session.pickerUri);
          if (supported) {
            await Linking.openURL(session.pickerUri);

            // Show instructions to user
            Alert.alert("Photo Picker Opened", 'Please select your photos in the browser window, then return to this app and tap "Load Selected Photos".', [
              { text: "OK", style: "default" },
              { text: "Load Selected Photos", onPress: () => loadSelectedPhotos(session.id) },
            ]);
          } else {
            setError("Cannot open Photo Picker. Please check your browser settings.");
          }
        }
      } else {
        setError("Failed to create Photo Picker session");
      }
    } catch (error) {
      setError(`Error opening Photo Picker: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSelectedPhotos = async (sessionId, retryCount = 0) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch media items using Photo Picker API
      const pageSize = 25;
      const response = await fetch(`https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}&pageSize=${pageSize}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await GooglePhotosService.getValidAccessToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.error?.status === "FAILED_PRECONDITION") {
          // Retry up to 3 times with increasing delays
          if (retryCount < 3) {
            const delay = (retryCount + 1) * 2000; // 2s, 4s, 6s
            setTimeout(async () => {
              await loadSelectedPhotos(sessionId, retryCount + 1);
            }, delay);
          }
          return;
        }

        throw new Error(`Photo Picker API error: ${response.status} - ${errorData.error?.message || "Unknown error"}`);
      }

      const data = await response.json();

      // Transform the data to match the expected format
      const photos = [];

      for (const item of data.mediaItems || []) {
        const baseUrl = item.mediaFile?.baseUrl;

        if (baseUrl) {
          const photo = {
            id: item.id,
            name: item.mediaFile?.filename || `Photo ${item.id}`,
            url: baseUrl,
            thumbnailUrl: baseUrl + "=w200-h200",
            fullSizeUrl: baseUrl + "=w2048-h2048",
            mimeType: item.mediaFile?.mimeType,
            creationTime: item.createTime,
            width: item.mediaFileMetadata?.width,
            height: item.mediaFileMetadata?.height,
          };
          photos.push(photo);
        }
      }

      setSelectedPhotos(photos);

      if (photos.length === 0) {
        Alert.alert("No Photos", "No photos were selected. Please try again.");
      } else {
        Alert.alert("Success", `Loaded ${photos.length} photos from your selection.`);
      }
    } catch (error) {
      setError(`Error loading photos: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDrivePhotos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const photos = await GooglePhotosService.fetchDrivePhotos();
      setSelectedPhotos(photos);

      if (photos.length === 0) {
        Alert.alert("No Photos", "No photos found in your Google Drive.");
      } else {
        Alert.alert("Success", `Loaded ${photos.length} photos from Google Drive.`);
      }
    } catch (error) {
      setError(`Error loading Drive photos: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectPhoto = (photo) => {
    // Navigate back to the previous screen with the selected photo
    if (route.params?.onPhotoSelect) {
      route.params.onPhotoSelect(photo);
    }
    navigation.goBack();
  };

  const renderPhotoItem = ({ item }) => (
    <TouchableOpacity style={styles.photoItem} onPress={() => selectPhoto(item)}>
      <Image source={{ uri: item.thumbnailUrl || item.url }} style={styles.photoThumbnail} resizeMode='cover' />
      <Text style={styles.photoName} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  // Login screen showing OAuth parameters
  if (showLoginScreen && oauthParams) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Google OAuth PKCE Login</Text>

        <View style={styles.paramSection}>
          <Text style={styles.sectionTitle}>Authorization Request Parameters:</Text>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>client_id:</Text>
            <Text style={styles.paramValue}>{oauthParams.client_id}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>code_verifier:</Text>
            <Text style={styles.paramValue}>{oauthParams.code_verifier}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>code_challenge:</Text>
            <Text style={styles.paramValue}>{oauthParams.code_challenge}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>redirect_uri:</Text>
            <Text style={styles.paramValue}>{oauthParams.redirect_uri}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>response_type:</Text>
            <Text style={styles.paramValue}>{oauthParams.response_type}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>scope:</Text>
            <Text style={styles.paramValue}>{oauthParams.scope}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>state:</Text>
            <Text style={styles.paramValue}>{oauthParams.state}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>code_challenge_method:</Text>
            <Text style={styles.paramValue}>{oauthParams.code_challenge_method}</Text>
          </View>
        </View>

        {authUrl && (
          <View style={styles.urlSection}>
            <Text style={styles.sectionTitle}>Full Authorization URL:</Text>
            <Text style={styles.urlText}>{authUrl}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowLoginScreen(false)}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Google Photos</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color='#4285F4' />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {tokenResponse && (
        <View style={styles.responseSection}>
          <Text style={styles.sectionTitle}>Token Exchange Response:</Text>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>client_id:</Text>
            <Text style={styles.paramValue}>{oauthParams?.client_id}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>code:</Text>
            <Text style={styles.paramValue}>{tokenResponse.code || "N/A"}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>redirect_uri:</Text>
            <Text style={styles.paramValue}>{oauthParams?.redirect_uri}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>grant_type:</Text>
            <Text style={styles.paramValue}>authorization_code</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>code_verifier:</Text>
            <Text style={styles.paramValue}>{oauthParams?.code_verifier}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>id_token:</Text>
            <Text style={styles.paramValue}>{tokenResponse.id_token || "N/A"}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>access_token:</Text>
            <Text style={styles.paramValue}>{tokenResponse.access_token || "N/A"}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>refresh_token:</Text>
            <Text style={styles.paramValue}>{tokenResponse.refresh_token || "N/A"}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>expires_in:</Text>
            <Text style={styles.paramValue}>{tokenResponse.expires_in || "N/A"}</Text>
          </View>
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>token_type:</Text>
            <Text style={styles.paramValue}>{tokenResponse.token_type || "N/A"}</Text>
          </View>
        </View>
      )}

      {!isAuthenticated ? (
        <View style={styles.authContainer}>
          <Text style={styles.authText}>Sign in with Google to access your photos</Text>
          <TouchableOpacity style={styles.authButton} onPress={handleGoogleAuth}>
            <Text style={styles.authButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.authenticatedContainer}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={openPhotoPicker}>
              <Text style={styles.actionButtonText}>Open Photo Picker</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={loadDrivePhotos}>
              <Text style={styles.actionButtonText}>Load Drive Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {selectedPhotos.length > 0 && (
            <View style={styles.photosContainer}>
              <Text style={styles.photosTitle}>Selected Photos ({selectedPhotos.length})</Text>
              <FlatList data={selectedPhotos} renderItem={renderPhotoItem} keyExtractor={(item) => item.id} numColumns={2} contentContainerStyle={styles.photosList} />
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  cancelButton: {
    backgroundColor: "#dc3545",
    padding: 15,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorContainer: {
    backgroundColor: "#f8d7da",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: "#721c24",
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  authContainer: {
    alignItems: "center",
    padding: 40,
  },
  authText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#666",
  },
  authButton: {
    backgroundColor: "#4285F4",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  authButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  authenticatedContainer: {
    flex: 1,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: "#34A853",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  photosContainer: {
    flex: 1,
  },
  photosTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  photosList: {
    paddingBottom: 20,
  },
  photoItem: {
    flex: 1,
    margin: 5,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  photoThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoName: {
    fontSize: 12,
    textAlign: "center",
    color: "#333",
  },
  paramSection: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  responseSection: {
    backgroundColor: "#e8f5e8",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  paramContainer: {
    flexDirection: "row",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  paramLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
    width: 120,
    marginRight: 10,
  },
  paramValue: {
    fontSize: 12,
    color: "#333",
    flex: 1,
    flexWrap: "wrap",
  },
  loginButton: {
    backgroundColor: "#4285F4",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  urlSection: {
    backgroundColor: "#e8f4fd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  urlText: {
    fontSize: 10,
    color: "#333",
    fontFamily: "monospace",
    flexWrap: "wrap",
  },
});
