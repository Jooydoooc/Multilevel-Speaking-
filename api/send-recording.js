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
    // Get environment variables
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    console.log('Environment check:', {
      hasToken: !!TELEGRAM_BOT_TOKEN,
      hasChatId: !!TELEGRAM_CHAT_ID,
      tokenLength: TELEGRAM_BOT_TOKEN ? TELEGRAM_BOT_TOKEN.length : 0
    });

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Missing Telegram credentials:', {
        token: TELEGRAM_BOT_TOKEN ? 'Present' : 'Missing',
        chatId: TELEGRAM_CHAT_ID ? 'Present' : 'Missing'
      });
      return res.status(500).json({ 
        error: 'Server configuration error - missing Telegram credentials',
        setupRequired: true
      });
    }

    // Parse the request body
    let body = '';
    if (typeof req.body === 'string') {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body.toString();
    } else if (typeof req.body === 'object') {
      // If body is already parsed (like with bodyParser)
      const studentInfo = req.body.studentInfo;
      const setName = req.body.setName;
      
      return await sendTelegramMessage(studentInfo, setName, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, res);
    }

    // Try to parse as JSON
    try {
      const data = JSON.parse(body);
      const studentInfo = data.studentInfo;
      const setName = data.setName;
      
      return await sendTelegramMessage(studentInfo, setName, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, res);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(400).json({ 
        error: 'Invalid JSON in request body',
        details: parseError.message 
      });
    }

  } catch (error) {
    console.error('Error processing recording:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

async function sendTelegramMessage(studentInfo, setName, botToken, chatId, res) {
  try {
    // Create message for Telegram
    const message = `
🎤 New Speaking Test Completed!

👤 Student: ${studentInfo.firstName} ${studentInfo.surname}
👥 Group: ${studentInfo.group}
📚 Set: ${setName}
📅 Date: ${studentInfo.date}
⏰ Time: ${studentInfo.time}
🌟 Practice makes perfect!
    `.trim();

    console.log('Sending to Telegram:', {
      chatId: chatId,
      student: `${studentInfo.firstName} ${studentInfo.surname}`,
      messageLength: message.length
    });

    // Send text message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const textResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const textResult = await textResponse.json();
    
    console.log('Telegram API response:', textResult);

    if (!textResult.ok) {
      console.error('Telegram API error:', textResult);
      return res.status(500).json({ 
        error: 'Failed to send message to Telegram',
        details: textResult.description,
        telegramError: true
      });
    }

    console.log('Successfully sent recording info to Telegram for student:', studentInfo.firstName);

    return res.status(200).json({ 
      success: true, 
      message: 'Recording information sent successfully',
      messageId: textResult.result.message_id
    });

  } catch (error) {
    console.error('Error in sendTelegramMessage:', error);
    throw error;
  }
}
