import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CombinedPage.css';
import APCreditPopup from './popup';

function CombinedPage() {
  // State definitions
  const [netid, setNetID] = useState(localStorage.getItem('netid') || '');
  const [plans, setPlans] = useState([]);
  const [selectedPlanID, setSelectedPlanID] = useState(null);
  const [planDetails, setPlanDetails] = useState([]);
  const [message, setMessage] = useState('');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showAPForm, setShowAPForm] = useState(false);
  const [apCourses, setAPCourses] = useState([]);
  const [showAPPopup, setShowAPPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [totalCreditsInfo, setTotalCreditsInfo] = useState(null);
  const [showTotalCreditsPopup, setShowTotalCreditsPopup] = useState(false);
  
  //New States for advanced features:
  // Additional state for advanced features
  const [prerequisiteWarnings, setPrerequisiteWarnings] = useState([]);
  const [showPrereqBypassModal, setShowPrereqBypassModal] = useState(false);
  const [bypassReason, setBypassReason] = useState('');
  const [pendingCourseAdd, setPendingCourseAdd] = useState(null);
  const [semesterCredits, setSemesterCredits] = useState({});
  const [progressAnalysis, setProgressAnalysis] = useState(null);

  //student major state variable:
  const [studentMajor, setStudentMajor] = useState('');

  //requirements state variables
  const [requirements, setRequirements] = useState({
    fulfilled: [],
    unfulfilled: [],
    removed: [] // Track manually removed requirements
  });
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);

  //progress state variables
  const [progressDetails, setProgressDetails] = useState({
    courseProgress: [],
    semesterProgress: [],
    summary: {
      totalCredits: 0,
      requirementsCompleted: 0,
      graduationStatus: '',
      expectedGraduation: ''
    }
  });
  const [showProgressModal, setShowProgressModal] = useState(false);

  const [newCourseData, setNewCourseData] = useState({
    courseid: '',
    semester: '',
  });

  const [newAPData, setNewAPData] = useState({
    apCredit: '',
    apScore: '',
  });

  useEffect(() => {
    if (netid) {
      fetchPlans();
    }
  }, [netid]);

  useEffect(() => {
    if (showAPForm) {
      fetchAPCourses();
    }
  }, [showAPForm]);

  useEffect(() => {
    if (selectedPlanID && planDetails.length > 0) {
      const semesters = [...new Set(planDetails.map(course => course.Semester))];
      semesters.forEach(semester => {
        fetchSemesterCredits(selectedPlanID, semester);
      });
    }
  }, [selectedPlanID, planDetails]);

  // Additional useEffect for semester credits
  useEffect(() => {
    if (selectedPlanID && planDetails.length > 0) {
      const semesters = [...new Set(planDetails.map(course => course.Semester))];
      semesters.forEach(semester => {
        fetchSemesterCredits(selectedPlanID, semester);
      });
    }
  }, [selectedPlanID, planDetails]);

  // Fetch semester credits (for 18-credit limit check)
  const fetchSemesterCredits = async (planID, semester) => {
    try {
      console.log(`Fetching credits for semester ${semester}`); // Debug log
      const response = await axios.get(
        `http://127.0.0.1:5000/api/plan/${planID}/semester-credits/${semester}`
      );
      console.log('Semester credits response:', response.data); // Debug log
      
      setSemesterCredits(prev => ({
        ...prev,
        [`${planID}-${semester}`]: response.data.total_credits || 0
      }));
    } catch (error) {
      console.error('Error fetching semester credits:', error);
      // Keep existing credits if there's an error
      setSemesterCredits(prev => ({
        ...prev,
        [`${planID}-${semester}`]: 0
      }));
    }
  };

  // Course ID validation (for constraint)
  const validateCourseID = (courseID) => {
    const coursePattern = /^[A-Z]{2,5}[0-9]{3}$/;
    return coursePattern.test(courseID.toUpperCase());
  };

  // Modified addCourse to handle prerequisites and credit limits
  const addCourse = async (e) => {
    e.preventDefault();
    
    // Validate course ID format
    if (!validateCourseID(newCourseData.courseid)) {
      setMessage('Invalid course ID format. Must be 2-5 letters followed by 3 numbers.');
      return;
    }
  
    try {
      setIsLoading(true);
      
      // First, check prerequisites
      const prereqResponse = await axios.get(
        `http://127.0.0.1:5000/api/course/prerequisites/${newCourseData.courseid}`
      );
  
      if (prereqResponse.data.missingPrerequisites?.length > 0) {
        setPrerequisiteWarnings(prereqResponse.data.missingPrerequisites);
        setPendingCourseAdd({
          planid: selectedPlanID,
          courseid: newCourseData.courseid.toUpperCase(),
          semester: newCourseData.semester.toUpperCase(),
          netid: netid
        });
        setShowPrereqBypassModal(true);
        return;
      }
  
      // Add course with validation (this will trigger our stored procedure)
      const payload = {
        planid: selectedPlanID,
        courseid: newCourseData.courseid.toUpperCase(),
        semester: newCourseData.semester.toUpperCase(),
        netid: netid
      };
  
      console.log('Sending payload:', payload); // Debug log
  
      const response = await axios.post('http://127.0.0.1:5000/api/course/add-with-validation', payload);
      
      if (response.status === 201) {
        setMessage('Course added successfully');
        fetchPlanDetails(selectedPlanID);
        // Update semester credits
        await fetchSemesterCredits(selectedPlanID, newCourseData.semester.toUpperCase());
        setShowCourseForm(false);
        setNewCourseData({ courseid: '', semester: '' });
        setPrerequisiteWarnings([]);
      }
    } catch (error) {
      console.error('Error adding course:', error);
      handleCourseAddError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle prerequisite bypass
  const handlePrereqBypass = async () => {
    if (!bypassReason.trim()) {
      setMessage('Please provide a reason for bypassing prerequisites');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        ...pendingCourseAdd,
        bypassReason: bypassReason,
      };

      const response = await axios.post('http://127.0.0.1:5000/api/course/add-with-bypass', payload);
      
      if (response.status === 201) {
        setMessage('Course added successfully with prerequisite bypass');
        fetchPlanDetails(selectedPlanID);
        setShowCourseForm(false);
        setNewCourseData({ courseid: '', semester: '' });
        setPrerequisiteWarnings([]);
        setShowPrereqBypassModal(false);
        setBypassReason('');
        setPendingCourseAdd(null);
      }
    } catch (error) {
      console.error('Error adding course with bypass:', error);
      setMessage(error.response?.data?.error || 'Error adding course with prerequisite bypass');
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced error handling for advanced features
  const handleCourseAddError = (error) => {
    const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error adding course';
    
    if (errorMessage.includes('exceed maximum credits')) {
      setMessage('Error: Adding this course would exceed the 18 credit limit for the semester');
    } else if (errorMessage.includes('time conflict')) {
      setMessage('Error: Cannot enroll in more than 6 courses per semester');
    } else if (errorMessage.includes('prerequisites')) {
      setMessage('Error: Prerequisites not met');
    } else {
      setMessage(errorMessage);
    }
  };

  // Analyze student progress using stored procedure
  const analyzeProgress = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`http://127.0.0.1:5000/api/student/progress/${netid}`);
      
      // Process and categorize the analysis data
      const processedData = {
        courseProgress: [],
        semesterProgress: [],
        summary: {
          totalCredits: 0,
          requirementsCompleted: 0,
          graduationStatus: '',
          expectedGraduation: ''
        }
      };
  
      response.data.forEach(item => {
        switch (item.category) {
          case 'Course':
            processedData.courseProgress.push(item);
            break;
          case 'Total Credits':
            processedData.summary.totalCredits = parseInt(item.detail);
            break;
          case 'Status':
            processedData.summary.graduationStatus = item.detail;
            break;
          case 'Requirements Progress':
            processedData.summary.requirementsCompleted = item.detail;
            break;
          case 'Expected Graduation':
            processedData.summary.expectedGraduation = item.detail;
            break;
          default:
            if (item.category.startsWith('Semester')) {
              processedData.semesterProgress.push(item);
            }
        }
      });
  
      setProgressDetails(processedData);
      setShowProgressModal(true);
      setMessage('Progress analysis completed successfully');
    } catch (error) {
      console.error('Error analyzing progress:', error);
      setMessage('Error analyzing student progress');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalCredits = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `http://127.0.0.1:5000/api/students/total-credits/${netid}`,
        {
          params: { planid: selectedPlanID }
        }
      );
      if (response.data) {
        setTotalCreditsInfo(response.data);
        setShowTotalCreditsPopup(true);
      }
    } catch (error) {
      console.error('Error fetching total credits:', error);
      setMessage('Error fetching total credits');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getRequirementsFulfilled = async () => {
  try {
    setIsLoading(true);
    const response = await axios.get(`http://127.0.0.1:5000/api/students/requirements/${netid}`);
    
    if (response.data) {
      setRequirements({
        ...requirements,
        fulfilled: response.data.fulfilled || [],
        unfulfilled: response.data.unfulfilled || []
      });
      setStudentMajor(response.data.majorId || ''); // Set the major
      setShowRequirementsModal(true);
    } else {
      setMessage('No requirements information found');
    }
  } catch (error) {
    console.error('Error fetching requirements:', error);
    setMessage('Error fetching requirements fulfilled');
  } finally {
    setIsLoading(false);
  }
};
  
  const removeRequirement = (courseId) => {
    setRequirements(prev => ({
      ...prev,
      unfulfilled: prev.unfulfilled.filter(course => course.CourseID !== courseId),
      removed: [...prev.removed, courseId]
    }));
  };

  const fetchAPCourses = async () => {
    try {
      console.log('Fetching AP courses...');
      setIsLoading(true);
      const response = await axios.get('http://127.0.0.1:5000/api/ap-courses');
      console.log('AP courses response:', response.data);
      
      if (Array.isArray(response.data)) {
        setAPCourses(response.data);
      } else {
        console.error('Unexpected AP courses response format:', response.data);
        setAPCourses([]);
        setMessage('Error loading AP courses.');
      }
    } catch (error) {
      console.error('Error fetching AP courses:', error);
      setAPCourses([]);
      setMessage('Error loading AP courses.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`http://127.0.0.1:5000/api/student/${netid}/plans`);
      setPlans(response.data);
      setMessage('');
    } catch (error) {
      console.error('Error fetching plans:', error);
      setMessage('Error fetching plans or no plans found.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlanDetails = async (planID) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`http://127.0.0.1:5000/api/plan/${planID}`);
      setPlanDetails(response.data);
      setSelectedPlanID(planID);
      setShowCourseForm(false);
      setShowAPForm(false);
      setMessage('');
    } catch (error) {
      console.error('Error fetching plan details:', error);
      setMessage('Error fetching plan details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Validation functions
  const validateAPScore = (score) => {
    const numScore = Number(score);
    if (!Number.isInteger(numScore) || numScore < 1 || numScore > 5) {
      setMessage('AP Score must be an integer between 1 and 5');
      return false;
    }
    return true;
  };

  // Form handling
  const handleAPSubmit = async ({ semester }) => {
    try {
      setIsLoading(true);
      // First get the CourseID based on AP Course and Score
      const apResponse = await axios.get('http://127.0.0.1:5000/api/ap-course-mapping', {
        params: {
          courseName: newAPData.apCredit,
          score: newAPData.apScore
        }
      });
      
      // If we got a valid CourseID, add it as a regular course
      if (apResponse.data.CourseID) {
        const payload = {
          planid: selectedPlanID,
          courseid: apResponse.data.CourseID, // Use the mapped CourseID
          semester: semester.toUpperCase()
        };
  
        // Use the existing course addition endpoint
        const response = await axios.post('http://127.0.0.1:5000/api/course', payload);
        
        if (response.status === 201) {
          setMessage('AP credit course added successfully');
          fetchPlanDetails(selectedPlanID);
          setShowAPForm(false);
          setNewAPData({ apCredit: '', apScore: '' });
        }
      }
    } catch (error) {
      console.error('Error adding AP credit course:', error);
      setMessage(error.response?.data?.error || 'Error adding AP credit course');
    } finally {
      setIsLoading(false);
      setShowAPPopup(false);
    }
  };

  const addAPCredit = async (e) => {
    e.preventDefault();
    
    if (!validateAPScore(newAPData.apScore)) {
      return;
    }
    
    setShowAPPopup(true);
  };

  // Delete operations
  const deletePlan = async (planID) => {
    try {
      setIsLoading(true);
      await axios.delete(`http://127.0.0.1:5000/api/plan/${planID}`);
      setPlans(plans.filter(plan => plan.PlanID !== planID));
      if (planID === selectedPlanID) {
        setPlanDetails([]);
        setShowCourseForm(false);
        setShowAPForm(false);
      }
      setMessage('Plan deleted successfully');
    } catch (error) {
      console.error('Error deleting plan:', error);
      setMessage('Error deleting plan');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCourse = async (courseID) => {
    try {
      setIsLoading(true);
      await axios.delete(`http://127.0.0.1:5000/api/plan/${selectedPlanID}/course/${courseID}`);
      setMessage('Course deleted successfully');
      fetchPlanDetails(selectedPlanID);
    } catch (error) {
      console.error('Error deleting course:', error);
      setMessage('Error deleting course');
    } finally {
      setIsLoading(false);
    }
  };

  // Add new plan
  const addPlan = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post('http://127.0.0.1:5000/api/plan', { netid });
      if (response.status === 201) {
        setMessage('Plan added successfully');
        fetchPlans();
      }
    } catch (error) {
      console.error('Error adding plan:', error);
      setMessage(error.response?.data?.error || 'Error adding plan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="combined-page-container">
      <h2>Academic Plans for {netid}</h2>

      {/* Enhanced message display to handle warnings */}
      {message && (
        <p className={`combined-page-message ${
          message.includes('success') ? 'success' : 
          message.includes('Warning') ? 'warning' : 'error'
        }`}>
          {message}
        </p>
      )}

      {/* Prerequisite warnings display */}
      {prerequisiteWarnings.length > 0 && !showPrereqBypassModal && (
        <div className="warning-box">
          <h4>Missing Prerequisites:</h4>
          <ul>
            {prerequisiteWarnings.map((prereq, index) => (
              <li key={index}>{prereq}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Existing Add Plan button */}
      <button 
        className="combined-page-button" 
        onClick={addPlan}
        disabled={isLoading}
      >
        {isLoading ? 'Adding...' : 'Add New Plan'}
      </button>

      {/* Existing plans table */}
      {plans.length > 0 ? (
        <table className="combined-page-table">
          <thead>
            <tr>
              <th>PlanID</th>
              <th>CreationDate</th>
              <th>NetID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(plan => (
              <tr key={plan.PlanID}>
                <td>{plan.PlanID}</td>
                <td>{plan.CreationDate}</td>
                <td>{plan.NetID}</td>
                <td>
                  <button 
                    className="combined-page-button" 
                    onClick={() => fetchPlanDetails(plan.PlanID)}
                    disabled={isLoading}
                  >
                    View Details
                  </button>
                  <button 
                    className="combined-page-button" 
                    onClick={() => deletePlan(plan.PlanID)}
                    disabled={isLoading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No plans available.</p>
      )}

      {selectedPlanID && (
        <>
          <h3>Plan Details for PlanID {selectedPlanID}</h3>

          {/* Enhanced plan actions with Progress Analysis */}
          <div className="plan-actions">
            <button 
              className="combined-page-button"
              onClick={getTotalCredits}
              disabled={isLoading}
            >
              View Total Credits
            </button>
            <button 
              className="combined-page-button"
              onClick={getRequirementsFulfilled}
              disabled={isLoading}
            >
              View Requirements Fulfilled
            </button>
            <button 
              className="combined-page-button"
              onClick={analyzeProgress}
              disabled={isLoading}
            >
              Analyze Progress
            </button>
            <button 
              className="combined-page-button"
              onClick={() => {
                setShowCourseForm(true);
                setShowAPForm(false);
              }}
              disabled={isLoading}
            >
              Add Course
            </button>
            <button 
              className="combined-page-button"
              onClick={() => {
                setShowAPForm(true);
                setShowCourseForm(false);
              }}
              disabled={isLoading}
            >
              Add AP Credit
            </button>
          </div>

          {/* Modified course table with semester grouping and credit tracking */}
          {planDetails.length > 0 ? (
            <div className="semester-groups">
              {[...new Set(planDetails.map(course => course.Semester))].sort().map(semester => (
                <div key={semester} className="semester-section">
                  <h4>
                    {semester} - Credits: {semesterCredits[`${selectedPlanID}-${semester}`] || 0}/18
                  </h4>
                  <table className="combined-page-table">
                    <thead>
                      <tr>
                        <th>CourseID</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planDetails
                        .filter(course => course.Semester === semester)
                        .map((course, index) => (
                          <tr key={index}>
                            <td>{course.CourseID}</td>
                            <td>
                              <button 
                                className="combined-page-button" 
                                onClick={() => deleteCourse(course.CourseID)}
                                disabled={isLoading}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <p>No courses in this plan.</p>
          )}

          {/* Existing Course Form with enhanced validation */}
          {showCourseForm && (
            <div className="form-container">
              <h4>Add Course to Plan</h4>
              <form className="combined-page-form" onSubmit={addCourse}>
                <label>
                  CourseID:
                  <input
                    type="text"
                    value={newCourseData.courseid}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setNewCourseData({ ...newCourseData, courseid: value });
                      if (!validateCourseID(value) && value.length > 0) {
                        setMessage('Course ID must be 2-5 letters followed by 3 numbers');
                      } else {
                        setMessage('');
                      }
                    }}
                    pattern="^[A-Za-z]{2,5}[0-9]{3}$"
                    required
                    disabled={isLoading}
                  />
                </label>
                <label>
                  Semester:
                  <input
                    type="text"
                    value={newCourseData.semester}
                    onChange={(e) => setNewCourseData({ 
                      ...newCourseData, 
                      semester: e.target.value 
                    })}
                    required
                    disabled={isLoading}
                  />
                </label>
                <button 
                  className="combined-page-button" 
                  type="submit"
                  disabled={isLoading || !validateCourseID(newCourseData.courseid)}
                >
                  {isLoading ? 'Adding...' : 'Add Course'}
                </button>
              </form>
            </div>
          )}

          {/* Existing AP Form */}
          {showAPForm && (
            <div className="form-container">
              <h4>Add AP Credit to Plan</h4>
              <form className="combined-page-form" onSubmit={addAPCredit}>
                <label>
                  AP Credit:
                  <select
                    value={newAPData.apCredit}
                    onChange={(e) => setNewAPData({ ...newAPData, apCredit: e.target.value })}
                    required
                    className="combined-page-select"
                    disabled={isLoading || !apCourses.length}
                  >
                    <option value="">Select AP Course</option>
                    {apCourses.map((course, index) => (
                      <option key={index} value={course.CourseName}>
                        {course.CourseName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  AP Score:
                  <select
                    value={newAPData.apScore}
                    onChange={(e) => setNewAPData({ ...newAPData, apScore: e.target.value })}
                    required
                    className="combined-page-select"
                    disabled={isLoading}
                  >
                    <option value="">Select AP Score</option>
                    {[1, 2, 3, 4, 5].map((score) => (
                      <option key={score} value={score}>
                        {score}
                      </option>
                    ))}
                  </select>
                </label>
                <button 
                  className="combined-page-button" 
                  type="submit"
                  disabled={isLoading || !apCourses.length}
                >
                  {isLoading ? 'Adding...' : 'Add AP Credit'}
                </button>
              </form>
            </div>
          )}
        </>
      )}
      
      {/* Prerequisite Bypass Modal */}
      {showPrereqBypassModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Missing Prerequisites</h4>
            <div className="prereq-warnings">
              {prerequisiteWarnings.map((prereq, index) => (
                <p key={index}>{prereq}</p>
              ))}
            </div>
            <textarea
              className="bypass-reason"
              value={bypassReason}
              onChange={(e) => setBypassReason(e.target.value)}
              placeholder="Enter reason for prerequisite bypass..."
              rows={3}
            />
            <div className="button-group">
              <button 
                className="combined-page-button confirm"
                onClick={handlePrereqBypass}
                disabled={!bypassReason.trim() || isLoading}
              >
                Bypass and Add Course
              </button>
              <button 
                className="combined-page-button cancel"
                onClick={() => {
                  setShowPrereqBypassModal(false);
                  setPendingCourseAdd(null);
                  setBypassReason('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Analysis Modal */}
      {progressAnalysis && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Progress Analysis</h3>
            <div className="progress-details">
              {progressAnalysis.map((item, index) => (
                <div key={index} className="progress-item">
                  <strong>{item.category}:</strong> {item.detail}
                </div>
              ))}
            </div>
            <button 
              className="combined-page-button"
              onClick={() => setProgressAnalysis(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Existing AP Credit Popup */}
      <APCreditPopup
        show={showAPPopup}
        apCredit={newAPData.apCredit}
        apScore={newAPData.apScore}
        onClose={() => setShowAPPopup(false)}
        onSubmit={handleAPSubmit}
      />

      {/* Existing Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      {/*Requirements Popup*/}
      {showRequirementsModal && (
        <div className="modal-overlay">
          <div className="modal-content requirements-modal">
            <h3>Degree Requirements Status</h3>
            
            {/* New personalized header */}
            <div className="requirements-header">
              <p className="major-notice">
                As a <strong>{studentMajor}</strong> major, you have to take note of the following:
              </p>
            </div>

            <div className="requirements-section">
              <h4>Fulfilled Requirements</h4>
              {requirements.fulfilled.length > 0 ? (
                <table className="requirements-table">
                  <thead>
                    <tr>
                      <th>Course ID</th>
                      <th>Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requirements.fulfilled.map((course, index) => (
                      <tr key={index} className="fulfilled">
                        <td>{course.CourseID}</td>
                        <td>{course.Credits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No requirements fulfilled yet</p>
              )}
            </div>
            <div className="requirements-section">
              <h4>Remaining Requirements</h4>
              {requirements.unfulfilled.length > 0 ? (
                <table className="requirements-table">
                  <thead>
                    <tr>
                      <th>Course ID</th>
                      <th>Credits</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requirements.unfulfilled.map((course, index) => (
                      <tr key={index} className="unfulfilled">
                        <td>{course.CourseID}</td>
                        <td>{course.Credits}</td>
                        <td>
                          <button 
                            className="combined-page-button small"
                            onClick={() => removeRequirement(course.CourseID)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>All requirements are fulfilled!</p>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="combined-page-button"
                onClick={() => setShowRequirementsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Total Credits Popup */}
        {showTotalCreditsPopup && totalCreditsInfo && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Total Credits Summary</h3>
              <p className="total-credits-message">{totalCreditsInfo.message}</p>
              <button 
                className="combined-page-button"
                onClick={() => setShowTotalCreditsPopup(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
        {/* Progress Analysis Results */}
        {progressAnalysis && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Academic Progress Analysis</h3>
              
              <div className="progress-details">
                {progressAnalysis.map((item, index) => (
                  <div key={index} className="progress-item">
                    <div className="progress-category">{item.category}:</div>
                    <div className="progress-detail">{item.detail}</div>
                  </div>
                ))}
              </div>

              <button 
                className="combined-page-button"
                onClick={() => setProgressAnalysis(null)}
              >
                Close Analysis
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

export default CombinedPage;