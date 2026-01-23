import axios from "./config"

const clevelandURL = "https://openaccess-api.clevelandart.org/api/artworks/"
const chicagoURL = "https://api.artic.edu/api/v1/artworks?fields=id,title,image_id"
const giphyURL = "https://api.giphy.com/v1/gifs/trending?api_key=Fo9QcAQLMFI8V6pdWWHWl9qmW91ZBjoK&"
const harvardURL= "https://api.harvardartmuseums.org/image?apikey=c10d3ea9-27b1-45b4-853a-3872440d9782"

async function getApiImagesHelper(userData){


    //user will select and 
        if (userData?.selectedPhotos && userData.selectedPhotos.length > 0 && 
        userData.deckUID?.startsWith('device-')) {
        let deviceImages = userData.selectedPhotos.map(photo => {
            return photo.url || photo.image_url || photo.thumbnailUrl
        }).filter(url => url) 
    
        const numOfRounds = userData.numOfRounds || deviceImages.length;
        deviceImages = randomize(deviceImages, numOfRounds)
        return deviceImages
    }
    
    // For Google Photos
    if (userData?.selectedPhotos && userData.selectedPhotos.length > 0 && 
        userData.deckUID?.startsWith('google-photos-')) {
        let googlePhotos = userData.selectedPhotos.map(photo => {
            return photo.url || photo.baseUrl;
        }).filter(url => url);
        
        const numOfRounds = userData.numOfRounds || googlePhotos.length;
        googlePhotos = randomize(googlePhotos, numOfRounds);
        return googlePhotos;
    }
    else if (userData.deckUID === "500-000006") {
        const imagesInfo = await axios.get(clevelandURL + "?limit=100").then(response => response.data.data)
        let clevelandImages = []
        for(let i = 0; i < imagesInfo.length; i++){
            if(imagesInfo[i].images !== null && imagesInfo[i].images.web !== undefined)
                clevelandImages.push(imagesInfo[i].images.web.url)
        }
        clevelandImages = randomize(clevelandImages, userData.numOfRounds)
        return validateCount(clevelandImages, userData.numOfRounds)
    }
    else if (userData.deckUID === "500-000007") {
        const path_begin = "https://www.artic.edu/iiif/2/"
        const path_end = "/full/843,/0/default.jpg"
        const imagesInfo = await axios.get(chicagoURL + "&limit=100").then(response => response.data.data)
        let chicagoImages = []
        for(let i = 0; i < imagesInfo.length; i++){
            if(imagesInfo[i].image_id !== null){
                const imageURL = path_begin + imagesInfo[i].image_id + path_end
                chicagoImages.push(imageURL)
            }
        }
        chicagoImages = randomize(chicagoImages, userData.numOfRounds)
        return validateCount(chicagoImages, userData.numOfRounds)
    }
    else if (userData.deckUID === "500-000008") {
        const imagesInfo = await axios.get(giphyURL + "&limit=50").then(response => response.data.data)
        let giphyImages = []
        for(let i = 0; i < imagesInfo.length; i++){
            if(imagesInfo[i].images.original.url !== null)
                giphyImages.push(imagesInfo[i].images.original.url)
        }
        giphyImages = randomize(giphyImages, userData.numOfRounds)
        return validateCount(giphyImages, userData.numOfRounds)
    }
    else if (userData.deckUID === "500-000009") {
        const imagesInfo = await axios.get(harvardURL + "&size=100").then(response => response.data.records)
        let harvardImages = []
        for(let i = 0; i < imagesInfo.length; i++){
            if(imagesInfo[i].baseimageurl !== null)
                harvardImages.push(imagesInfo[i].baseimageurl)
        }
        harvardImages = randomize(harvardImages, userData.numOfRounds)
        return validateCount(harvardImages, userData.numOfRounds)
    }
    else if (userData.deckUID === "500-000010") {
        let cnnURL = await axios.get(userData.CNN_URL).then(response => response.config.url)
        let cnnImages = await getCnnImgURLs(cnnURL)
        cnnImages = randomize(cnnImages, userData.numOfRounds)
        return validateCount(cnnImages, userData.numOfRounds)
    }
    else if (userData.deckUID === "500-000011") {
        // Handle device images uploaded to Google Drive
        console.log("📸 Processing device images from userData.selectedPhotos");
        if (!userData.selectedPhotos || userData.selectedPhotos.length === 0) {
            console.error("No selectedPhotos found in userData");
            return []
        }
        
        // Extract Google Drive URLs from selectedPhotos
        let deviceImages = userData.selectedPhotos.map(photo => {
            return photo.url || photo.webContentLink || photo.thumbnailUrl
        }).filter(url => url) // Remove any undefined/null values
        
        console.log(`📸 Found ${deviceImages.length} device images`);
        
        // For device images, return whatever we have (images will be reused if less than numOfRounds)
        deviceImages = randomize(deviceImages, userData.numOfRounds)
        console.log(` Returning ${deviceImages.length} images for game`);
        return deviceImages
    }
    return []
}

function randomize(inputArray, numOfRounds){
    let tempArray = []
    const copy = [...inputArray]
    const safeRounds = Math.min(numOfRounds, copy.length)
    for(let i = 0; i < safeRounds; i++){
        const randomIndex = Math.floor(Math.random() * copy.length)
        const imageURL = copy.splice(randomIndex, 1)
        tempArray.push(imageURL[0])
    }
    return tempArray
}

function validateCount(imageList, expectedCount) {
    if (!imageList || imageList.length < expectedCount) {
        console.warn(`⚠️ Not enough valid images. Expected ${expectedCount}, got ${imageList.length}`)
        return []
    }
    return imageList
}

async function getCnnImgURLs(URL) {
    try {
      const response = await fetch(URL);
      const htmlString = await response.text();
      const imgURLs = [...htmlString.matchAll(/<img[^>]+src=\"([^">]+)\"/g)].map(match => match[1]);
      return imgURLs;
    } catch (error) {
      console.error('Error fetching or parsing HTML:', error);
      return [];
    }
}

async function getCurrentCnnURL() {
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
    let cnnURL = ""
    let beginDate = new Date()
    let endDate = new Date()
    beginDate.setDate(endDate.getDate() - 7)
    for (let i = 0; i <= 365; i++) {
        let beginDay = beginDate.getDate(), beginMonth = beginDate.getMonth()
        let endDay = endDate.getDate(), endMonth = endDate.getMonth(), endYear = endDate.getFullYear()
        let potentialCnnURL = ""
        if(endDay < 10)
            potentialCnnURL = `https://www.cnn.com/${endYear}/${endMonth + 1}/0${endDay}/world/gallery/photos-this-week-${months[beginMonth]}-${beginDay}-${months[endMonth]}-${endDay}/index.html`
        else
            potentialCnnURL = `https://www.cnn.com/${endYear}/${endMonth + 1}/${endDay}/world/gallery/photos-this-week-${months[beginMonth]}-${beginDay}-${months[endMonth]}-${endDay}/index.html`
        try {
            cnnURL = await axios.get(potentialCnnURL).then(response => response.config.url)
            break
        }
        catch (error) {
            beginDate.setDate(beginDate.getDate() - 1)
            endDate.setDate(endDate.getDate() - 1)
        }
    }
    return getCnnImgURLs(cnnURL)
}

const handleApiError = (error, onRetry, context) => {
    console.error(error)
    const {setShow, setOnRetry, setTitle, setDescription} = context
    if(error.response) {
        setTitle("Server error - SQL error")
        setDescription(error.response.data.message)
    } else if(error.code === "ECONNABORTED" && error.message.includes("timeout")) {
        setTitle("Network error - Timeout error")
        setDescription("This is taking longer than usual. Please check your network connection and try again")
    } else {
        setTitle("Network error - Send error")
        setDescription("Unable to reach server. Please check your network connection and try again")
    }
    setOnRetry(() => onRetry)
    setShow(true)
}

export { getApiImagesHelper, handleApiError }
