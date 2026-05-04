const mongoose = require('mongoose');
const User = require('./src/models/User').default;
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
    const tutors = await User.find({ role: { $in: ['tutor', 'verified_tutor'] } }, 'name courses department areaOfStrength matchingBio');
    console.log(JSON.stringify(tutors, null, 2));
    process.exit(0);
});
