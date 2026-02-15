import { useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaUpload, FaSpinner } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import Modal from '../components/shared/Modal';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export default function LocationsPage() {
  const { locations, addLocation, updateLocation, deleteLocation, loading } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    latitude: '',
    longitude: ''
  });
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleOpenModal = (location = null) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        image: location.image || '',
        latitude: location.latitude || '',
        longitude: location.longitude || ''
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        image: '',
        latitude: '',
        longitude: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      image: '',
      latitude: '',
      longitude: ''
    });
    setIsDragging(false);
  };

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
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(`${API_URL}/locations/upload`, formData, {
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
      if (editingLocation) {
        await updateLocation(editingLocation.id, formData);
      } else {
        await addLocation(formData);
      }
      handleCloseModal();
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('האם אתה בטוח שברצונך למחוק מיקום זה?')) {
      try {
        await deleteLocation(id);
      } catch (error) {
        alert('שגיאה: ' + error.message);
      }
    }
  };

  if (loading) {
    return <div className="p-6">טוען...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">מיקומים</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-orange-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlus />
          מיקום חדש
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FaMapMarkerAlt className="mx-auto text-6xl mb-4 text-gray-300" />
          <p>אין מיקומים במערכת</p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-4 text-primary hover:text-orange-600"
          >
            הוסף מיקום ראשון
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {location.image ? (
                <img
                  src={location.image}
                  alt={location.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <FaMapMarkerAlt className="text-6xl text-gray-400" />
                </div>
              )}

              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{location.name}</h3>

                {(location.latitude || location.longitude) && (
                  <div className="text-sm text-gray-600 mb-3">
                    <p>קואורדינטות:</p>
                    <p className="font-mono text-xs">
                      {location.latitude && `Lat: ${location.latitude}`}
                      {location.latitude && location.longitude && ' | '}
                      {location.longitude && `Lng: ${location.longitude}`}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleOpenModal(location)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    <FaEdit />
                    ערוך
                  </button>
                  <button
                    onClick={() => handleDelete(location.id)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    <FaTrash />
                    מחק
                  </button>
                </div>

                {(location.latitude && location.longitude) && (
                  <a
                    href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2 text-center text-primary hover:text-orange-600 text-sm"
                  >
                    פתח במפות Google
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingLocation ? 'ערוך מיקום' : 'מיקום חדש'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">שם המיקום *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-4 py-2"
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
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2"
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
                  <label className="cursor-pointer bg-primary hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors">
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
                className="w-full border rounded-lg px-4 py-2"
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
                className="w-full border rounded-lg px-4 py-2"
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
              className="flex-1 bg-primary hover:bg-orange-600 text-white py-2 rounded-lg"
            >
              {editingLocation ? 'עדכן' : 'צור'}
            </button>
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg"
            >
              ביטול
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
