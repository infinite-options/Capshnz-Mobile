import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
//import { useCookies } from 'react-cookie';
import { getCnnImageURLS, sendError } from '../util/Api.js'; // Ensure the path is correct

const CnnDeck = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [userData, setUserData] = useState(route.params || {});
    //const [cookies, setCookie] = useCookies(['userData']);
    const [CNNImageURL, setCNNImageURL] = useState([]);
    const [loadingImg, setLoadingImg] = useState(0);
    const isMessageDisplayed = useRef(false);

    useEffect(() => {
        const getCnnURLS = async () => {
            try {
                const response = await getCnnImageURLS();
                const CNNImageURLResponse = response.data;
                console.log('CNNImageURLResponse', CNNImageURLResponse);
                if (CNNImageURLResponse.length === 0) {
                    setLoadingImg(3);
                    isMessageDisplayed.current = true;
                    Alert.alert(
                        'CNN Deck Not Available',
                        'The CNN deck may not be available right now. Please select another deck.',
                        [{ text: 'OK' }]
                    );
                    sendError('CNN Deck is not loading', `loading for the user ${userData.alias}`);
                } else {
                    setLoadingImg(4);
                    setCNNImageURL(CNNImageURLResponse);
                }
            } catch (error) {
                console.error(error);
            }
        };

        if (loadingImg === 0) {
            setLoadingImg(1);
            getCnnURLS();
        }

        const interval = setInterval(() => {
            if (!isMessageDisplayed.current) {
                if (loadingImg === 1) {
                    Alert.alert(
                        'Loading Delayed',
                        'Loading of the CNN deck is taking longer than expected. Please be patient.',
                        [{ text: 'OK' }]
                    );
                    setLoadingImg(2);
                } else if (loadingImg === 2) {
                    setLoadingImg(3);
                    isMessageDisplayed.current = true;
                    Alert.alert(
                        'CNN Deck Not Available',
                        'The CNN deck may not be available right now. Please select another deck.',
                        [{ text: 'OK' }]
                    );
                    sendError('CNN Deck is not loading', `loading for the user ${userData.alias}`);
                }
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [loadingImg, userData]);

    const handleClick = (Link_Url) => {
        const updatedUserData = {
            ...userData,
            CNN_URL: Link_Url,
        };
        setUserData(updatedUserData);
        //setCookie('userData', updatedUserData, { path: '/' });
        navigation.push('WaitingRoom', {...updatedUserData });
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.heading}>Select Deck from the list</Text>
            {CNNImageURL.length === 0 && loadingImg !== 4 ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : (
                CNNImageURL.map((CNNImage, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.card}
                        onPress={() => handleClick(CNNImage.article_link)}
                    >
                        <Image source={{ uri: CNNImage.thumbnail_link }} style={styles.image} />
                        <View style={styles.cardText}>
                            <Text style={styles.title}>{CNNImage.title}</Text>
                            <Text style={styles.date}>{CNNImage.date}</Text>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 3,
    },
    image: {
        width: 100,
        height: 100,
    },
    cardText: {
        flex: 1,
        padding: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    date: {
        fontSize: 14,
        color: '#555',
    },
});

export default CnnDeck;
