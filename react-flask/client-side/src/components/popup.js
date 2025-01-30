import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './popup.css';

const APCreditPopup = ({ show, apCredit, apScore, onClose, onSubmit }) => {
  const [semester, setSemester] = useState('');
  const [message, setMessage] = useState('');
  const [courseId, setCourseId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (show && apCredit && apScore) {
      checkAPCredit();
    }
  }, [show, apCredit, apScore]);

  const checkAPCredit = async () => {
    setIsLoading(true);
    console.log("Attempting AP credit check with:", { courseName: apCredit, score: apScore }); // Add this
    if (parseInt(apScore) <= 2) {
      setMessage("HAVE YOU GONE BONKERS?? You've failed the exam dummy! Pick and choose a credited course that you actually passed");
      setCourseId(null);
    } else {
      try {
        const response = await axios.get(`http://127.0.0.1:5000/api/ap-course-mapping`, {
          params: {
            courseName: apCredit,
            score: apScore
          }
        });
        console.log("AP credit response:", response.data); // Add this
        if (response.data.CourseID) {
          setCourseId(response.data.CourseID);
          setMessage(`CONGRATULATIONS!!! You've earned a free ${response.data.CourseID} course, mention which semester you've taken the AP exam in.`);
        }
      } catch (error) {
        console.error('Error checking AP credit:', error);
        setMessage('Error validating AP credit. Please try again.');
      }
    }
    setIsLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (courseId && semester) {
      onSubmit({ semester: semester.toUpperCase() });
      setSemester('');
      // Note: Removed auto-close logic. Now popup will stay open until user closes it
    }
  };

  if (!show) return null;

  return (
    <div className="ap-popup-overlay">
      <div className="ap-popup-content">
        <button className="ap-popup-close" onClick={onClose}>×</button>
        
        <div className="ap-popup-message">
          {isLoading ? (
            <p>Checking AP credit...</p>
          ) : (
            <p>{message}</p>
          )}
        </div>

        {courseId && (
          <form onSubmit={handleSubmit} className="ap-popup-form">
            <div className="ap-popup-form-group">
              <label>
                Semester:
                <input
                  type="text"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Enter semester (e.g., FA23)"
                />
              </label>
            </div>
            <button type="submit" className="ap-popup-submit" disabled={isLoading || !semester}>
              Submit
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default APCreditPopup;