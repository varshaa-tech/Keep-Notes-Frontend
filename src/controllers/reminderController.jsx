// controllers/reminderController.js
export const createReminder = async (req, res) => {
  try {
    const { title, description, dueDate, dueTime, priority } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: 'Title and due date are required' });
    }

    const newReminder = await Reminder.create({
      title,
      description,
      dueDate,
      dueTime,
      priority,
      userId: req.user.id,  // Assuming JWT token decoding sets req.user
    });

    res.status(201).json(newReminder);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create reminder', error: error.message });
  }
};
