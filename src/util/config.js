import axios from "axios"

const instance = axios.create()
instance.defaults.timeout = 20000

export default instance
