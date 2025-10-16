// src/utils/storage.js
export const loadNotes = () => {
  try {
    const notes = JSON.parse(localStorage.getItem('keepNotes') || '[]')
    return notes
  } catch (error) {
    console.error('Error loading notes:', error)
    return []
  }
}

export const saveNotes = (notes) => {
  try {
    localStorage.setItem('keepNotes', JSON.stringify(notes))
  } catch (error) {
    console.error('Error saving notes:', error)
  }
}