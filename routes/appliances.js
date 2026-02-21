const express = require('express');
const router = express.Router();
const Appliance = require('../models/Appliance');

// GET /api/appliances/:userId - Get all appliances for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const appliances = await Appliance.find({ userId });
    res.json(appliances);
  } catch (error) {
    console.error('Error fetching appliances:', error);
    res.status(500).json({ message: 'Error fetching appliances', error: error.message });
  }
});

// POST /api/appliances - Add a new appliance
router.post('/', async (req, res) => {
  try {
    const { name, brand, deviceID, userId } = req.body;

    // Validate required fields
    if (!name || !brand || !deviceID || !userId) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const appliance = new Appliance({
      name,
      brand,
      deviceID,
      userId,
      powerConsumption: 0,
      isActive: true
    });

    await appliance.save();

    res.status(201).json({
      message: 'Appliance connected successfully',
      appliance
    });
  } catch (error) {
    console.error('Error connecting appliance:', error);
    res.status(500).json({ message: 'Error connecting appliance', error: error.message });
  }
});

// DELETE /api/appliances/:id - Delete an appliance
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Appliance.findByIdAndDelete(id);
    res.json({ message: 'Appliance deleted successfully' });
  } catch (error) {
    console.error('Error deleting appliance:', error);
    res.status(500).json({ message: 'Error deleting appliance', error: error.message });
  }
});

module.exports = router;
