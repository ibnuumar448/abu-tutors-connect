const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/abututors');
  console.log('Connected to DB');
  
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  
  users.forEach(u => {
    if (u.documents && u.documents.profilePicture) {
        console.log(`User ${u.email} has profilePicture:`, u.documents.profilePicture);
    } else {
        console.log(`User ${u.email} has NO profilePicture`);
    }
  });
  
  process.exit(0);
}

run().catch(console.error);
