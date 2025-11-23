const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Missing Telegram credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Parse the form data
    const studentInfo = JSON.parse(req.body.studentInfo);
    const setName = req.body.setName;
    
    // Create message for Telegram
    const message = `
🎤 New Speaking Test Completed!

👤 Student: ${studentInfo.firstName} ${studentInfo.surname}
👥 Group: ${studentInfo.group}
📚 Set: ${setName}
📅 Date: ${studentInfo.date}
⏰ Time: ${studentInfo.time}
🌟 Practice makes perfect!
    `;

    // Send text message to Telegram
    const textResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const textResult = await textResponse.json();
    
    if (!textResult.ok) {
      console.error('Telegram message error:', textResult);
      return res.status(500).json({ 
        error: 'Failed to send message to Telegram',
        details: textResult.description
      });
    }

    console.log('Successfully sent recording info to Telegram for student:', studentInfo.firstName);

    res.status(200).json({ 
      success: true, 
      message: 'Recording information sent successfully' 
    });

  } catch (error) {
    console.error('Error processing recording:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
