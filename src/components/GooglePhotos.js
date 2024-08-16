import React, { useState } from 'react';
import { View, Text, Button, Image, ScrollView, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';
// import { useGoogleLogin } from '@react-oauth/google';
//import { GoogleLogin,GoogleOAuthProvider } from '@react-oauth/google';
import axios from '../util/config';
import { CLIENT_ID } from '@env';
import { CLIENT_SECRET } from '@env';

export default function GooglePhotos() {
    const navigation = useNavigation();
    const route = useRoute();
    const [userData, setUserData] = useState(route.params);
    const [tokens, setTokens] = useState({});
    const [albums, setAlbums] = useState([]);
    const [signedIn, setSignedIn] = useState(false);
    const [selectedAlbum, setSelectedAlbum] = useState("");
    const [albumImages, setAlbumImages] = useState([]);
    const searchGooglePhotosURL = "https://photoslibrary.googleapis.com/v1/mediaItems:search";

    const clientID  = CLIENT_ID;
    console.log("client id: ", clientID);
    const clientSecret  = CLIENT_SECRET;
    console.log("client secret: ", clientSecret);
    

    const login = useGoogleLogin({
        flow: 'auth-code',
        onSuccess: async (response) => {
            axios.post('https://oauth2.googleapis.com/token', {
                code: response.code,
                client_id: clientID,
                client_secret: clientSecret,
                redirect_uri: "yourapp://redirect",
                grant_type: "authorization_code"
            })
            .then(res => {
                setSignedIn(true);
                setTokens(res.data);

                const headers = {
                    Accept: 'application/json',
                    Authorization: 'Bearer ' + res.data.access_token,
                };

                axios.get('https://photoslibrary.googleapis.com/v1/sharedAlbums', { headers })
                    .then(res => {
                        setAlbums(res.data.sharedAlbums);
                    });
            });
        },
        onFailure: (response) => console.log(response),
        scope: "https://www.googleapis.com/auth/photoslibrary.readonly"
    });

    const chooseAlbums = () => {
        return albums.map((entry, index) => (
            <View key={index} style={styles.albumButtonContainer}>
                <Button
                    title={entry.title}
                    color={selectedAlbum === entry.title ? "blue" : "gray"}
                    onPress={() => {
                        setSelectedAlbum(entry.title);
                        getPhotos(entry);
                    }}
                />
            </View>
        ));
    };

    function getPhotos(entry) {
        setUserData({
            ...userData,
            googlePhotos: {
                albumId: entry.id,
                accessToken: tokens.access_token,
            }
        });

        const body = {
            pageSize: "50",
            albumId: entry.id
        };

        const headers = {
            Accept: 'application/json',
            Authorization: 'Bearer ' + tokens.access_token,
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

        navigation.navigate("WaitingRoom", {...updatedUserData });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {signedIn ? (
                    <Text style={styles.headerText}>Select shared album as a deck</Text>
                ) : (
                    <View>
                        <Text style={styles.headerText}>Sign in to play with an album</Text>
                        <Button title="Log In to Google Photos" onPress={() => login()} />
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
    },
    header: {
        marginBottom: 20,
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
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
