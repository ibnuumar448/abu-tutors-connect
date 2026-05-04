const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./src/models/User').default;
const Session = require('./src/models/Session').default;

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log("Connected to DB");
    const sessions = await Session.find().populate('tutorId').limit(1);
    if (!sessions.length) {
        console.log("No sessions found");
        process.exit();
    }
    
    const session = sessions[0];
    const tutorId = session.tutorId._id;
    console.log("Testing with tutor", tutorId);
    
    const tutor = await User.findById(tutorId);
    console.log("Before availability:", JSON.stringify(tutor.availability, null, 2));
    
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const sessionDate = session.date;
    const sessionTime = session.time;
    const dayName = dayNames[new Date(sessionDate).getDay()];
    
    console.log(`Trying to restore slot for ${dayName} at ${sessionTime}`);
    
    if (tutor.availability && Array.isArray(tutor.availability)) {
        let updated = false;
        // MUST DO THIS OR WE ARE MUTATING THE MONGOOSE CACHE AND NOT UPDATING PROPERLY
        const newAvailability = JSON.parse(JSON.stringify(tutor.availability));
        
        newAvailability.forEach((avail) => {
            if (avail.day === dayName && Array.isArray(avail.slots)) {
                if (!avail.slots.includes(sessionTime)) {
                    avail.slots.push(sessionTime);
                    avail.slots.sort((a, b) => {
                        const partsA = a.split(':').map(Number);
                        const partsB = b.split(':').map(Number);
                        return (partsA[0] * 60 + partsA[1]) - (partsB[0] * 60 + partsB[1]);
                    });
                    updated = true;
                }
            }
        });

        if (updated) {
            console.log("Updated availability array:", JSON.stringify(newAvailability, null, 2));
            // Try updating
            await User.findByIdAndUpdate(tutorId, { availability: newAvailability });
            console.log("Updated via findByIdAndUpdate");
            
            const tutorAfter = await User.findById(tutorId);
            console.log("After availability (findByIdAndUpdate):", JSON.stringify(tutorAfter.availability, null, 2));
            
            // Revert
            await User.findByIdAndUpdate(tutorId, { availability: tutor.availability });
        } else {
            console.log("No update was necessary (slot already exists or day not found)");
        }
    }
    
    process.exit();
});
