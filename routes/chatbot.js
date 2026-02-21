const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const Appliance = require('../models/Appliance');

// POST /api/chatbot - Get AI-powered response based on user energy data
router.post('/', async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ reply: 'Please provide both message and userId.' });
    }

    // Fetch user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ reply: 'User not found.' });
    }

    // Fetch user's appliances with energy data
    const appliances = await Appliance.find({ userId: userId });
    
    // Calculate energy statistics
    const totalEnergyPoints = user.energyPoints || 0;
    const totalEnergySaved = user.energySaved || 0;
    const totalCoalSaved = user.coalSaved || 0;
    const totalCo2Reduced = user.co2Reduced || 0;
    
    // Get appliance usage summary
    const applianceSummary = appliances.map(app => ({
      name: app.name,
      status: app.status,
      powerConsumption: app.powerConsumption || 0,
      usageHours: app.usageHours || 0
    }));

    // Prepare context for AI
    const userContext = `
User Information:
- Name: ${user.name}
- Energy Points: ${totalEnergyPoints}
- Energy Saved: ${totalEnergySaved} kWh
- Coal Saved: ${totalCoalSaved} kg
- CO2 Reduced: ${totalCo2Reduced} kg

Appliances:
${applianceSummary.length > 0 ? applianceSummary.map(a => `- ${a.name}: ${a.powerConsumption}W, ${a.usageHours} hours/day, Status: ${a.status}`).join('\n') : 'No appliances connected'}
    `.trim();

    // Check if Hugging Face token is available
    const hfToken = process.env.HF_TOKEN;

    if (!hfToken) {
      // Fallback to rule-based responses if no token
      const reply = generateRuleBasedResponse(message, {
        totalEnergyPoints,
        totalEnergySaved,
        totalCoalSaved,
        totalCo2Reduced,
        applianceCount: appliances.length,
        applianceSummary
      });
      return res.json({ reply });
    }

    // Create prompt for the AI model
    const prompt = `You are an energy efficiency assistant for EcoWatt app. Help users understand their energy consumption, provide tips to save energy, and explain their environmental impact. Be friendly, concise, and helpful.

User's energy data:
${userContext}

User question: ${message}

Provide a helpful response:`;

    // Call Hugging Face Inference API
    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.7,
          top_p: 0.9
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let aiReply = hfResponse.data[0]?.generated_text || '';
    
    // Extract just the response part (after the prompt)
    if (aiReply.includes('Provide a helpful response:')) {
      aiReply = aiReply.split('Provide a helpful response:')[1].trim();
    }
    
    // If response is empty or too short, use fallback
    if (!aiReply || aiReply.length < 10) {
      const reply = generateRuleBasedResponse(message, {
        totalEnergyPoints,
        totalEnergySaved,
        totalCoalSaved,
        totalCo2Reduced,
        applianceCount: appliances.length,
        applianceSummary
      });
      return res.json({ reply: reply });
    }

    res.json({ reply: aiReply });

  } catch (error) {
    console.error('Chatbot error:', error.message);
    
    // If Hugging Face API fails, try fallback response
    const reply = generateRuleBasedResponse(message, {
      totalEnergyPoints: 0,
      totalEnergySaved: 0,
      totalCoalSaved: 0,
      totalCo2Reduced: 0,
      applianceCount: 0,
      applianceSummary: []
    });
    res.json({ reply: reply + '\n\n(Note: AI service temporarily unavailable. Using basic responses.)' });
  }
});

// Fallback rule-based responses
function generateRuleBasedResponse(message, userData) {
  const lowerMessage = message.toLowerCase();
  
  // Energy points related
  if (lowerMessage.includes('point') || lowerMessage.includes('score')) {
    return `You currently have ${userData.totalEnergyPoints} energy points! Keep saving energy to earn more points.`;
  }
  
  // Energy saved related
  if (lowerMessage.includes('save') || lowerMessage.includes('saved')) {
    return `Great job! You've saved ${userData.totalEnergySaved} kWh of energy. This is equivalent to ${userData.totalCoalSaved} kg of coal not burned and ${userData.totalCo2Reduced} kg of CO2 emissions prevented!`;
  }
  
  // Appliance related
  if (lowerMessage.includes('appliance') || lowerMessage.includes('device')) {
    if (userData.applianceCount === 0) {
      return 'You have no appliances connected yet. Connect your appliances to track their energy consumption!';
    }
    return `You have ${userData.applianceCount} appliance(s) connected:\n${userData.applianceSummary.map(a => `• ${a.name}: ${a.powerConsumption}W`).join('\n')}`;
  }
  
  // Tips
  if (lowerMessage.includes('tip') || lowerMessage.includes('how to') || lowerMessage.includes('advice')) {
    return `Here are some energy-saving tips:\n• Turn off unused appliances\n• Use LED bulbs\n• Set your AC to 24-26°C\n• Unplug chargers when not in use`;
  }
  
  // Environmental impact
  if (lowerMessage.includes('environment') || lowerMessage.includes('coal') || lowerMessage.includes('co2') || lowerMessage.includes('carbon')) {
    return `Your environmental impact:\n• Coal saved: ${userData.totalCoalSaved} kg\n• CO2 reduced: ${userData.totalCo2Reduced} kg\nYou're making a positive difference!`;
  }
  
  // Greeting
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return `Hello! I'm your EcoWatt energy assistant. Ask me about your energy usage, tips to save power, or your environmental impact!`;
  }
  
  // Default helpful response
  return `I can help you with:\n• Your energy points and savings\n• Appliance usage information\n• Energy-saving tips\n• Your environmental impact\n\nWhat would you like to know?`;
}

module.exports = router;
