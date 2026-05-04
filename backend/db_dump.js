const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/abututors').then(async () => {
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({role: {$in: ['tutor', 'verified_tutor']}}).toArray();
    console.log(JSON.stringify(users.map(u => ({
        id: u._id,
        name: u.name,
        courses: u.courses,
        department: u.department,
        role: u.role,
        bio: u.matchingBio || u.areaOfStrength
    })), null, 2));
    process.exit();
});
