import React, { useEffect, useState } from 'react';
import axios from 'axios';

function PlanDetailsTable() {
  const [courses, setCourses] = useState([]);
  const planid = 1; // Replace with dynamic value if needed

  useEffect(() => {
    axios.get(`http://127.0.0.1:5000/api/plan/${planid}`)
      .then((response) => {
        setCourses(response.data);
      })
      .catch((error) => {
        console.error('Error fetching plan details:', error);
      });
  }, [planid]);

  return (
    <div>
      <h2>Plan Details for PlanID {planid}</h2>
      {courses.length > 0 ? (
        <table border="1" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {Object.keys(courses[0]).map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.map((course, index) => (
              <tr key={index}>
                {Object.keys(course).map((key) => (
                  <td key={key}>{course[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Loading plan details...</p>
      )}
    </div>
  );
}

export default PlanDetailsTable;
