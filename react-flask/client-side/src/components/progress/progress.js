import React from 'react';
import './progress.css';

const ProgressAnalysisComponent = ({ analysis, isLoading }) => {
  if (isLoading) {
    return <div className="loading">Analyzing progress...</div>;
  }

  if (!analysis) {
    return null;
  }

  // Separate different types of analysis
  const courseProgress = analysis.filter(item => item.category === 'Course');
  const requirementsProgress = analysis.find(item => item.category === 'Requirements Progress');
  const totalCredits = analysis.find(item => item.category === 'Total Credits');
  const graduationStatus = analysis.find(item => item.category === 'Status');
  const expectedGraduation = analysis.find(item => item.category === 'Expected Graduation');
  const semesterProgress = analysis.filter(item => item.category.startsWith('Semester'));

  return (
    <div className="progress-analysis-container">
      {/* Summary Section */}
      <div className="progress-summary">
        <div className="summary-box credits">
          <h3>Credits Progress</h3>
          <p>{totalCredits?.detail}</p>
          <p className="status">{graduationStatus?.detail}</p>
        </div>
        
        <div className="summary-box requirements">
          <h3>Requirements</h3>
          <p>{requirementsProgress?.detail}</p>
          <p>{expectedGraduation?.detail}</p>
        </div>
      </div>

      {/* Semester Breakdown */}
      <div className="semester-breakdown">
        <h3>Semester Progress</h3>
        <div className="semester-grid">
          {semesterProgress.map((sem, index) => (
            <div key={index} className="semester-box">
              <h4>{sem.category}</h4>
              <p>{sem.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Course Details */}
      <div className="course-details">
        <h3>Completed Courses</h3>
        <div className="course-grid">
          {courseProgress.map((course, index) => (
            <div key={index} className="course-box">
              {course.detail}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Updated progress analysis function in your CombinedPage component
const analyzeProgress = async () => {
  try {
    setIsLoading(true);
    const response = await axios.get(`http://127.0.0.1:5000/api/student/progress/${netid}`);
    
    setProgressAnalysis(response.data);
    
    // Show a success message without the raw data
    setMessage('Progress analysis completed successfully. Review the detailed breakdown below.');
    
  } catch (error) {
    console.error('Error analyzing progress:', error);
    setMessage('Error analyzing student progress');
  } finally {
    setIsLoading(false);
  }
};