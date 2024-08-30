import React,{ useEffect, useState } from "react";
import { View, Text, Button, Image, ScrollView, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute,useFocusEffect } from '@react-navigation/native';
import * as Google from "expo-auth-session/providers/google";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from 'expo-auth-session';
import axios from '../util/config';


export default function GooglePhotos() {

    const ios_ClientId = process.env.EXPO_PUBLIC_IOS_CLIENT_ID;
    const clientSecret = process.env.EXPO_PUBLIC_CLIENT_SECRET;
    const [token, setToken] = useState("");
    const [userInfo, setUserInfo] = useState(null);
    const navigation = useNavigation();
    const route = useRoute();
    const [userData, setUserData] = useState(route.params);
    const [tokens, setTokens] = useState({});
    const [albums, setAlbums] = useState([]);
    const [signedIn, setSignedIn] = useState(false);
    const [selectedAlbum, setSelectedAlbum] = useState("");
    const [albumImages, setAlbumImages] = useState([]);
    const searchGooglePhotosURL = "https://photoslibrary.googleapis.com/v1/mediaItems:search";
    const [isClicked, setIsClicked] = useState(false);

    const REDIRECT_URI = AuthSession.makeRedirectUri({
      useProxy: true, // Use a proxy to handle redirect URIs in Expo
  });

  

    useFocusEffect(
        React.useCallback(() => {
            navigation.setOptions({ headerShown: false });
        }, [navigation])
    );



   const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "",
    iosClientId: ios_ClientId,
    scopes: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/photoslibrary.readonly'
    ],

  });

  useEffect(() => {
    handleEffect();    
  }, [response, token]);

  async function handleEffect() {
    const user = await getLocalUser();

    if (!user) {
       if (response?.type === "success") {
         getUserInfo(response.authentication);
       }
     } else {
         setUserInfo(user);
         

        if (response?.type === "success") {   
             const { accessToken } = response.authentication;

         setToken(accessToken); 

         fetchAlbums(accessToken);
        } 
      
     }
  }

  const handlePress = () => {
    setIsClicked(true); 
    promptAsync(); 
  };

  const fetchAlbums = async (token) => {

    if (!token)
     return;
    try {
        const response = await fetch(
            'https://photoslibrary.googleapis.com/v1/sharedAlbums',
    
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        const data = await response.json();
        setAlbums(data.sharedAlbums || []);

    } catch (error) {
        console.error('Error fetching albums:', error);
    }
};

  const getLocalUser = async () => {
    const data = await AsyncStorage.getItem("@user");
    if (!data) return null;
    return JSON.parse(data);
  };

  const getUserInfo = async (token) => {
    if (!token) return;
    try {
      const response = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const user = await response.json();
      await AsyncStorage.setItem("@user", JSON.stringify(user));
      setUserInfo(user);
    } catch (error) {
      // Add your own error handler here
    }
    
  };

  const chooseAlbums = () => {


      return albums.map((entry, index) => (
          <View key={index} style={styles.albumButtonContainer}>
              <Button
                  title={entry.title ? String(entry.title) : "Untitled"}
                  color={selectedAlbum === entry.title ? "selectedGooglePhotos" : "buttonGooglePhotos"}
                  onPress={() => {

                      setSelectedAlbum(entry.title);
                      getPhotos(entry);
                  }}
              />
          </View>
      ));
  };

  async function getPhotos(entry) {

      setUserData({
          ...userData,
          googlePhotos: {
              albumId: entry.id,
              accessToken: token,
          }
      });


      const body = {
          pageSize: "50",
          albumId: entry.id
      };

      const headers = {
          Accept: 'application/json',
          Authorization: 'Bearer ' + token,
      };
      axios.post(searchGooglePhotosURL, body, { headers })
      .then(res => {
          const imageUrls = res.data.mediaItems.map(picture => picture.baseUrl);
          setAlbumImages(imageUrls);
      });
  }

  const submitAlbum = async () => {

      if (albumImages.length < userData.numOfRounds) {

          Alert.alert(
              "Insufficient Images",
              `Please select an album with enough images for each round.\nTotal Images: ${albumImages.length}\nTotal Rounds: ${userData.numOfRounds}`
          );
          return;
      }

      const updatedUserData = {
          ...userData,
          deckSelected: true,
          isApi: true,
          deckTitle: "Google Photos",
          deckUID: "500-000005",
          googlePhotos: albumImages
      };


      navigation.reset({
        index: 0,
        routes: [{ name: "WaitingRoom", params: {...updatedUserData} }],
      });
      
  };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {signedIn ? (
                    <Text style={styles.headerText}>Select shared album as a deck</Text>
                ) : (
                    <View style={styles.signinContainer}>
                        <Text style={styles.headerText}>Sign in to play with an album</Text>

                        <TouchableOpacity
                         style={[styles.button, isClicked && styles.buttonClicked]} 
                         onPress={() => handlePress()}
                         >
                        <Text style={styles.buttonText}>Log In to Google Photos</Text>
                        </TouchableOpacity> 

                        {/* <Button style ={styles.buttonContainer}title="Log In to Google Photos" onPress={() => promptAsync()} /> */}
                    </View>
                )}
            </View>

            <ScrollView style={styles.albumsContainer}>
            {chooseAlbums()}
            </ScrollView>
            
            <ScrollView contentContainerStyle={styles.imagesContainer}>
                {albumImages.map((url, index) => (
                    <Image key={index} style={styles.image} source={{ uri: url }} />
                ))}
            </ScrollView>

            {selectedAlbum !== "" && (
                <View style={styles.continueButtonContainer}>
                    <Button title="Continue" onPress={submitAlbum} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#C8DAD8',
    },
    signinContainer: {
        alignItems: 'center',
        fontFamily: 'Grandstander',
        marginTop: 40,
    },
    header: {
        marginBottom: 20,
    },
    button: {
        width: 300,
        height: 55,
        backgroundColor: "#DC816A",
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,

        },
        buttonText: {
        color: "white",
        fontSize: 20,
        fontFamily: "Grandstander",
        fontWeight: "700",
        },
        buttonClicked: {
            width: 300,
            height: 55,
            backgroundColor: "blue",
            borderRadius: 40,
            justifyContent: "center",
            alignItems: "center",
            marginTop: 10,
    
            },    
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        paddingBottom:20
    },
    albumsContainer: {
        marginBottom: 20,
    },
    albumButtonContainer: {
        marginBottom: 10,
    },
    imagesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    },
    image: {
        width: 100,
        height: 100,
        margin: 5,
    },
    continueButtonContainer: {
        marginTop: 20,
    },
});

