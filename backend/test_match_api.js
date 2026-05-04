const testMatch = async () => {
    try {
        console.log('Testing AI Match Mock Endpoint...');
        const matchRes = await fetch('http://localhost:5001/api/match/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                course: 'MATH105',
                topic: 'React State Management',
                prompt: 'I am struggling to pass state between Next.js components and need a tutor.'
            })
        });

        const textData = await matchRes.text();
        console.log('Match API Response Status:', matchRes.status);
        console.log('Match API Response Text:\n', textData);

    } catch (e) {
        console.error('Test Failed:', e);
    }
};

testMatch();
