import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CourseGraph from './CourseGraph'; // Import the CourseGraph component
import './PrerequisitesTable.css';

function PrerequisitesTable() {
  const [search, setSearch] = useState('');
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [prerequisites, setPrerequisites] = useState([]);

  useEffect(() => {
    if (search.length >= 2) {
      axios
        .get(`http://127.0.0.1:5000/api/courses/search?q=${search}`)
        .then((response) => {
          setFilteredCourses(response.data);
          if (response.data.length > 0) {
            setSelectedCourse(response.data[0].CourseID);
          } else {
            setSelectedCourse('');
            setPrerequisites([]);
          }
        })
        .catch((error) => {
          console.error('Error fetching filtered courses:', error);
        });
    } else {
      setFilteredCourses([]);
      setSelectedCourse('');
      setPrerequisites([]);
    }
  }, [search]);

  useEffect(() => {
    if (selectedCourse) {
      axios
        .get(`http://127.0.0.1:5000/api/course/${selectedCourse}/prerequisites`)
        .then((response) => {
          setPrerequisites(response.data);
        })
        .catch((error) => {
          console.error('Error fetching prerequisites:', error);
          setPrerequisites([]);
        });
    } else {
      setPrerequisites([]);
    }
  }, [selectedCourse]);

  return (
    <div className="prerequisites-container">
      <h2>Course Prerequisites</h2>

      <label htmlFor="course-search">Search for a Course:</label>
      <input
        type="text"
        id="course-search"
        placeholder="Enter course ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredCourses.length > 0 && (
        <>
          <label htmlFor="course-select">Select a Course:</label>
          <select
            id="course-select"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            {filteredCourses.map((course) => (
              <option key={course.CourseID} value={course.CourseID}>
                {course.CourseID}
              </option>
            ))}
          </select>
        </>
      )}

      {selectedCourse && prerequisites.length > 0 ? (
        <>
          <h3>Prerequisites for {selectedCourse}</h3>
          <table>
            <thead>
              <tr>
                {Object.keys(prerequisites[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prerequisites.map((prerequisite, index) => (
                <tr key={index}>
                  {Object.keys(prerequisite).map((key) => (
                    <td key={key}>{prerequisite[key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        selectedCourse && <p>No prerequisites available for {selectedCourse}.</p>
      )}

      {selectedCourse && <CourseGraph selectedCourse={selectedCourse} />}
    </div>
  );
}

export default PrerequisitesTable;
