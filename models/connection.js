const mongoose = require('mongoose');

const connectionString = "mongodb+srv://Karim:LaCapsule@cluster0.zlaetun.mongodb.net/crowdfurring";

mongoose.connect(connectionString, { connectTimeoutMS: 2000 })
    .then(() => console.log('Database connected'))
    .catch(error => console.error(error));