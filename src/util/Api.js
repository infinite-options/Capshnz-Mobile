import axios from "./config"
import { getApiImagesHelper } from "./ApiHelper"
import { useEffect } from "react"

const checkGameURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/checkGame"
const checkEmailCodeURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/checkEmailValidationCode"
const addUserURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/addUser"
const createGameURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/createGame"
const joinGameURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/joinGame"
const decksURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/decks"
const selectDeckURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/selectDeck"
const postAssignDeckURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/assignDeck"
const postRoundImageURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/postRoundImage"
const getPlayersURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/getPlayers/"
const getImageURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/getImageForPlayers/"
const getUniqueImageInRoundURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/getUniqueImageInRound/"
const submitCaptionURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/submitCaption"
const getAllSubmittedCaptionsURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/getAllSubmittedCaptions/"
const postVoteCaptionURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/voteCaption"
const getUpdateScoresURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/updateScores/"
const getPlayersWhoHaventVotedURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/getPlayersWhoHaventVoted/"
const getScoreBoardURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/getScoreBoard/"
const createNextRoundURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/createNextRound"
const createRounds = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/createRounds"
const nextImage = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/getNextImage"
const errorURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/sendError/"
const CheckGameURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/getRoundImage"
// const getCNNDeckURLS = "https://myx6g22dd2rtcpviw3d5wuz7eu0zudaq.lambda-url.us-west-2.on.aws/"
// const getCNNDeckURLS = "http://127.0.0.1:4000/api/v2/cnn_webscrape"
const getCNNDeckURLS = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/cnn_webscrape"
const getgameScoreURL =  "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/getScores/"
const addUserByEmailURL =  "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/addUserByEmail"
const addFeedbackURL =  "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/addFeedback"
const summaryURL =  "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/summary"
const summaryEmailURL =  "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/summaryEmail"
const getCurrentRoundURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/getCurrentGame"

async function checkGameCode(gameCode){
    const codeStatus = await axios.get(checkGameURL + '/' + gameCode)
    if(codeStatus.data.warning === "Invalid game code") {
        alert("Please enter a valid game code.")
        return false
    }
    return true
}

async function checkGameStarted(gameCode,round){
    const Game_status = await axios.get(CheckGameURL + '/' + gameCode + ',' + round)
    if(Game_status.data.result[0].round_image_uid === null ) {
        return false
    }
    return true
}
async function getGameImageForRound(gameCode,round){
    const Game_status = await axios.get(CheckGameURL + '/' + gameCode + ',' + round)
    return Game_status.data.result[0].round_image_uid
}

async function checkEmailCode(playerUID, code){
    const payload = {
        user_uid: playerUID,
        code: code
    }
    
    const status = await axios.post(checkEmailCodeURL, payload)
        .then(response => response.data)
    return status
}

async function addUser(userData) {

    const payload = {
        user_name: userData.name,
        user_email: userData.email,
        user_zip: userData.zipCode,
        user_alias: userData.alias
    }
    /*const playerInfo = await axios.post(addUserURL, payload)
        .then(response => response.data)
    return playerInfo */

    try {

        const response = await axios.post(addUserURL, payload);

        return response.data;
      } catch (error) {
        if (error.response) {
          // Server responded with a status other than 2xx
          console.error('Error Response:', error.response.data);
          console.error('Status:', error.response.status);
          console.error('Headers:', error.response.headers);
        } else if (error.request) {
          // Request was made but no response received
          console.error('Request Error:', error.request);
        } else {
          // Something else happened while setting up the request
          console.error('Error Message:', error.message);
        }
        console.error('Config:', error.config);
        throw error; // Re-throw the error after logging
      }
}

async function addUserByEmail(email) {
    const response = await axios.post(addUserByEmailURL, 
        { email })

    return response.data
   
}

async function getCnnImageURLS() {
    const CnnImageURLS = await axios.get(getCNNDeckURLS, {
        timeout: 60000
    }).then(response => {
        if (response.status != 200) {
            return []
        }            
        return response.data
    })
    return CnnImageURLS
}

async function createGame(playerUID, numOfRounds, roundTime, scoreType){
   
    const payload = {
        user_uid: playerUID,
        rounds: numOfRounds.toString(),
        round_time: "00:00:" + roundTime.toString(),
        scoring_scheme: scoreType
    }

    const gameInfo = await axios.post(createGameURL, payload)
        .then(response => response.data)

    return gameInfo
}



async function joinGame(userData){
   
        const payload = {
            game_code: userData.gameCode,
            user_uid: userData.playerUID
        }

        
        const joinGamerespone =  await axios.post(joinGameURL, payload)
             .then(response => response.data)

        return
   
}

async function getDecks(playerUID){
    const decksInfo = await axios.get(decksURL + "/" + playerUID + "," + "true")
        .then(response => response.data.decks_info)
    return decksInfo
}

async function getPlayers(gameCode){
    const players = await axios.get(getPlayersURL + gameCode)
        .then(response => response.data.players_list)
    return players
}

async function selectDeck(deckUID, gameCode, roundNumber){
    const payload = {
        game_code: gameCode.toString(),
        deck_uid: deckUID.toString(),
        round_number: roundNumber.toString()
    }

    const deckresponse =  await axios.post(selectDeckURL, payload)
        .then(response => response.data)

    return
}

async function assignDeck(deckUID, gameCode){
    const payload = {
        deck_uid: deckUID,
        game_code: gameCode
    }
    await axios.post(postAssignDeckURL, payload)
    return
}

async function setDatabaseImages(gameCode, roundNumber){
    await axios.get(getUniqueImageInRoundURL + gameCode + "," + roundNumber)
    return
}

async function getApiImages(userData){
    const imageURLs = await getApiImagesHelper(userData)
    return imageURLs
}

async function postRoundImage(gameCode, roundNumber, imageURL){
    const payload = {
        game_code: gameCode,
        round_number: roundNumber.toString(),
        image: imageURL
    }
    await axios.post(postRoundImageURL, payload)
    return
}

async function getDatabaseImage(userData){

    const imageURL = await axios.get(getImageURL + userData.gameCode + "," + userData.roundNumber)
        .then(response => response.data.image_url)
    return imageURL
}

async function submitCaption(caption, userData){
    const payload = {
        caption: caption,
        user_uid: userData.playerUID,
        game_code: userData.gameCode,
        round_number: userData.roundNumber.toString()
    }
    const numOfPlayersSubmitting = await axios.post(submitCaptionURL, payload)
        .then(response => response.data.no_caption_submitted)
    return numOfPlayersSubmitting
}

async function getSubmittedCaptions(userData) {
    const submittedCaptions = await axios.get(getAllSubmittedCaptionsURL + userData.gameCode + "," + userData.roundNumber)
        .then(response => response.data.players)
    return submittedCaptions
}

async function postVote(caption, userData){
    const payload = {
        caption: caption,
        user_id: userData.playerUID,
        game_code: userData.gameCode,
        round_number: userData.roundNumber.toString()
    }
    const numOfPlayersVoting = await axios.post(postVoteCaptionURL, payload)
        .then(response => response.data.players_count)
    return numOfPlayersVoting
}

async function updateScores(userData){
    await axios.get(getUpdateScoresURL + userData.gameCode + "," + userData.roundNumber)
    return
}

async function leftOverVotingPlayers(userData){
    const numOfPlayersVoting = await axios.get(getPlayersWhoHaventVotedURL + userData.gameCode + "," + userData.roundNumber)
        .then(response => response.data.players_count)
    return numOfPlayersVoting
}

async function getScoreBoard(userData){
    const scoreBoard = await axios.get(getScoreBoardURL + userData.gameCode + "," + userData.roundNumber)
        .then(response => response.data.scoreboard)
    return scoreBoard
}

async function createNextRound(userData){
    const payload = {
        game_code: userData.gameCode,
        round_number: userData.roundNumber.toString()
    }
    await axios.post(createNextRoundURL, payload)
    return
}



async function postCreateRounds(gameCode, imageURLs){
try{    
    const payload = {
        game_code: gameCode,
        images: imageURLs
    };
    

    const imageURL = await axios.post(createRounds, payload)
   // .then(response => response.data.image)
   .then(response => response.data)

   return imageURL.image;

}        
catch(error) {
    if(error.response){
        // the request was made and the server responded with the response code that is out of 2xx
        console.log('headers ',error.response.headers);
        console.log('request ',error.request );
        console.log('error', error.message);
       
  
    } else if (error.request) {
        // the request was made but no response was recieved the `error.request` is an instance of XMLHttpRequest in the browser and a instance of http.ClientRequet in Node.Js
        console.log(error.request);
    }else {
        // Something happened that triggered an error
        console.log('error', error.message);
    }
    console.log('err--',error.config);
    
  };
   
}



// old code without retry
// async function getNextImage(gameCode, roundNumber){
//     const payload = {
//         game_code: gameCode,
//         round_number: roundNumber.toString()
//     }
//     const imageURL = await axios.post(nextImage, payload)
//         .then(response => response.data.image)
//     return imageURL
// }

async function getNextImage(gameCode, roundNumber) {
    const payload = {
        game_code: gameCode,
        round_number: roundNumber.toString()
    };

    const maxRetries = 3;
    let retries = 0;
    let error;

    while (retries < maxRetries) {
    
        try {
           // const response = await axios.post(nextImage, payload);
           // return response.data.image;

            const imageURL = await axios.post(nextImage, payload)
            .then(response => response.data)

            return imageURL.image;

        } catch (err) {
            // Capture the error 

            error = err;
            // Increment the retry count
            retries++;
        }
    }

    // trow error after retries exhaust
    throw error;
}


async function sendError(code1, code2){
    await axios.get(errorURL + code1 + "*" + code2).then(res => {console.log(res)})
    return
}
async function getGameScore(gameCode,roundNo){
    const scoreboard = await axios.get(getgameScoreURL + '/' + gameCode + ',' + roundNo).then(response => {
        return response.data.scoreboard
    })
    return scoreboard
}
async function addFeedback(userData, feedback) {
    const payload = {
        name: userData.name,
        email: userData.email,
        feedback: feedback
    }
    await axios.post(addFeedbackURL, payload)
}
async function summary(gameUID) {
    return await axios.get(`${summaryURL}?gameUID=${gameUID}`)
}

async function getCurrentRound(gameUID){
    return await axios.get(`${getCurrentRoundURL}?gameUID=${gameUID}`)
}
function summaryEmail(userData) {
    const payload = {
        gameUID: userData.gameUID,
        email: userData.email,
    }
    axios.post(summaryEmailURL, payload)
}
export { checkGameCode, checkEmailCode, addUser, createGame, addUserByEmail, summary,
    joinGame, getDecks, selectDeck, assignDeck, setDatabaseImages, addFeedback, summaryEmail,
    getApiImages, postRoundImage, getDatabaseImage, getPlayers, submitCaption,
    getSubmittedCaptions, postVote, updateScores, leftOverVotingPlayers, getScoreBoard,
    createNextRound, postCreateRounds, getNextImage, sendError,getCnnImageURLS ,checkGameStarted,getGameScore,getGameImageForRound, getCurrentRound}