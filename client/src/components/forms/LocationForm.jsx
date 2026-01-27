import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FaUpload, FaSpinner, FaTrash } from 'react-icons/fa';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export default function LocationForm({ location, onClose }) {
  const { addLocation, updateLocation } = useApp();
  const [formData, setFormData] = useState({
    name: location?.name || '',
    image: location?.image || '',
    latitude: location?.latitude || '',
    longitude: location?.longitude || ''
  });
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('רק קבצי תמונה מותרים');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('גודל הקובץ לא יכול לעלות על 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await axios.post(`${API_URL}/locations/upload`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setFormData(prev => ({ ...prev, image: `${API_URL}${response.data.imageUrl}` }));
    } catch (error) {
      alert('שגיאה בהעלאת התמונה: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (location) {
        await updateLocation(location.id, formData);
      } else {
        await addLocation(formData);
      }
      onClose();
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">שם המיקום *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full border rounded-lg px-4 py-2 min-h-[44px]"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">העלאת תמונה</label>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-orange-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {uploadingImage ? (
            <div className="flex flex-col items-center gap-2">
              <FaSpinner className="text-3xl text-primary animate-spin" />
              <p className="text-sm text-gray-600">מעלה תמונה...</p>
            </div>
          ) : formData.image ? (
            <div className="relative">
              <img
                src={formData.image}
                alt="תצוגה מקדימה"
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, image: '' })}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-all duration-150"
              >
                <FaTrash />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <FaUpload className="text-4xl text-gray-400" />
              <div>
                <p className="text-gray-700 font-medium">גרור ושחרר תמונה כאן</p>
                <p className="text-sm text-gray-500 mt-1">או</p>
              </div>
              <label className="cursor-pointer bg-primary hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors min-h-[44px] flex items-center active:scale-95">
                בחר קובץ
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG, GIF, WEBP (מקסימום 5MB)
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Latitude (קו רוחב)</label>
          <input
            type="number"
            step="any"
            value={formData.latitude}
            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
            className="w-full border rounded-lg px-4 py-2 min-h-[44px]"
            placeholder="31.7683"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Longitude (קו אורך)</label>
          <input
            type="number"
            step="any"
            value={formData.longitude}
            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
            className="w-full border rounded-lg px-4 py-2 min-h-[44px]"
            placeholder="35.2137"
          />
        </div>
      </div>

      <div className="text-xs text-gray-500">
        <p>💡 טיפ: כדי למצוא קואורדינטות:</p>
        <ol className="list-decimal list-inside mr-4 mt-1">
          <li>פתח את Google Maps</li>
          <li>לחץ ימני על המיקום</li>
          <li>לחץ על הקואורדינטות כדי להעתיק</li>
        </ol>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-primary hover:bg-orange-600 text-white py-2 rounded-lg min-h-[44px] transition-all duration-150 active:scale-95"
        >
          {location ? 'עדכן' : 'צור'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg min-h-[44px] transition-all duration-150 active:scale-95"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
