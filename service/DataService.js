const axios = require("axios")

class DataService {

    async saveData(payload) {
        const response = await axios.post('http://localhost:5000/api/vehicle',payload)
        const data = await response.data;
        console.log(data)
    }
}
module.exports = DataService